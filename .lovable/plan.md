
# Brain Diagnostic → Shelf Scroll with Physics Commentary

## What CARFIX has changed

The `query-brain` API now returns two new fields in each `diagnosis_trace` entry:

- `partslot_id` (integer | null) — identifies the matched product category
- `partslot_description` (string | null) — exact category string, e.g. `"BRAKE FLUID"`

`commercial_sku` is now always `null`. The `partslot_description` is the primary discovery mechanism — it maps directly to the `category` parameter of the `retrieve-parts` API.

---

## What needs to change and where

The work is entirely in the `bob-chat` edge function. The widget frontend already has all the plumbing needed — `onHighlightPart` scrolls the shelf and `parts_found` populates products. We just need the edge function to use the new Brain fields correctly after a `diagnose_symptom` call.

### Current flow (broken for this use case)

```text
User: "my brake pedal feels spongy"
→ diagnose_symptom forced (symptom detected)
→ Brain returns diagnosis_trace[0].partslot_description = "BRAKE FLUID"
→ Current code: only enriches commercial_sku (which is now null — no-op)
→ AI writes physics commentary
→ No retrieve-parts call triggered
→ Shelf does not scroll
```

### Target flow (after fix)

```text
User: "my brake pedal feels spongy"
→ diagnose_symptom forced
→ Brain returns partslot_description = "BRAKE FLUID", partslot_id = 3803
→ Edge function: extracts partslot_description, calls retrieve-parts with category
→ Parts result stored in _partsToEmit
→ highlight_category SSE event emitted with partslot_description
→ AI writes physics commentary (physics_title + physics_logic)
→ Stream opens: parts_found event fires → shelf populates with BRAKE FLUID products
→ highlight_category event fires → shelf auto-scrolls to BRAKE FLUID section
→ Customer sees relevant vehicle-specific products without leaving Bob
```

---

## Files to change

Only **one file** requires modification: `supabase/functions/bob-chat/index.ts`

---

## Detailed changes to `bob-chat/index.ts`

### Change 1 — After diagnose_symptom result, call retrieve-parts using partslot_description

**Location:** inside `case "diagnose_symptom":` in `executeToolCall` (lines ~1836–1863)

Currently, after getting `enrichedTrace`, the function only enriches `commercial_sku`. We need to add: for each entry with a `partslot_description`, call `retrieveParts(vehicleId, apiConfig, partslot_description)` using it as the `category` filter — but only if a valid `vehicleId` is available from the current session context.

The cleanest pattern (matching how other tools work) is: store the `partslot_description` on the conversation messages object (like `_partsToEmit`), then have the calling code handle the fetch. But since `executeToolCall` doesn't have direct access to vehicle context, the better approach is to **return the partslot_description in the tool result** so the outer tool loop can act on it.

Specifically:

```typescript
case "diagnose_symptom": {
  const brainResult = await diagnoseBrainSymptom(args.user_query) as any;

  if (brainResult.no_match || brainResult.error) {
    return { no_match: true, message: brainResult.error || 'No matching diagnosis found' };
  }

  const diagnosisTrace = brainResult.diagnosis_trace || brainResult.results || [];
  const enrichedTrace = await Promise.all(
    diagnosisTrace.map(async (entry: any) => {
      if (entry.commercial_sku) {
        const partData = await lookupPartBySku(String(entry.commercial_sku));
        return { ...entry, catalog_part: partData };
      }
      return entry;
    })
  );

  // NEW: Extract the first partslot_description for vehicle-specific parts lookup
  const firstMatch = enrichedTrace.find((e: any) => e.partslot_description);
  const partslotDescription = firstMatch?.partslot_description || null;
  const partslotId = firstMatch?.partslot_id || null;

  return {
    no_match: false,
    confidence_tier: brainResult.confidence_tier || brainResult.confidence || 'unknown',
    diagnosis_trace: enrichedTrace,
    summary: brainResult.summary || null,
    // NEW: Pass back to caller so outer loop can fetch vehicle-specific parts
    _partslot_description: partslotDescription,
    _partslot_id: partslotId,
  };
}
```

### Change 2 — In the outer tool loop, when diagnose_symptom returns a partslot_description, fetch filtered parts

**Location:** after `const result = await executeToolCall(toolCall, apiConfig)` inside the `for (const toolCall of assistantMessage.tool_calls)` loop (around lines ~2779–2892)

Add a new block after the existing `retrieve_parts` result handler:

```typescript
// ============= BRAIN DIAGNOSIS PARTS FETCH =============
// When Brain returns a partslot_description, fetch vehicle-specific parts filtered to that category
if (toolCall.function.name === "diagnose_symptom") {
  const diagResult = result as any;
  const partslotDesc = diagResult._partslot_description;
  const vehicleIdForParts = effectiveVehicleContext?.vehicle_id || effectiveVehicleContext?.id;

  if (partslotDesc && vehicleIdForParts) {
    console.log(`[Brain→Parts] Fetching parts for category "${partslotDesc}", vehicle ${vehicleIdForParts}`);

    const filteredParts = await retrieveParts(vehicleIdForParts, apiConfig, partslotDesc);

    if (filteredParts.success && filteredParts.parts.length > 0) {
      console.log(`[Brain→Parts] Fetched ${filteredParts.parts.length} parts for "${partslotDesc}"`);
      // Store for emission (merges with any existing parts)
      const existing = (conversationMessages as any)._partsToEmit || [];
      (conversationMessages as any)._partsToEmit = existing.length > 0 ? existing : filteredParts.parts;

      // Store the category for shelf-scroll highlight event
      (conversationMessages as any)._diagnosisHighlightCategory = partslotDesc;
    } else {
      console.log(`[Brain→Parts] No parts found for "${partslotDesc}" — shelf will retain existing state`);
    }
  } else if (partslotDesc && !vehicleIdForParts) {
    console.log(`[Brain→Parts] Has partslot_description but no confirmed vehicle — skipping parts fetch`);
  }
}
```

**Key design note:** We use `existing.length > 0 ? existing : filteredParts.parts` so that if the full 500-part catalog is already loaded (from the initial auto-fetch), we don't overwrite it with a smaller filtered set. The highlight/scroll handles the UX of pointing the user to the right section.

### Change 3 — Emit a `highlight_category` SSE event before the AI stream

**Location:** in the `transformedStream` `start(controller)` function, after the `parts_found` emission block (~line 3200)

Add:

```typescript
// ============= BRAIN DIAGNOSIS HIGHLIGHT EVENT =============
// When Brain diagnosed a specific part category, emit a highlight event
// so the frontend can auto-scroll to that category on the shelf
const diagnosisHighlightCategory = (conversationMessages as any)._diagnosisHighlightCategory;
if (diagnosisHighlightCategory) {
  const highlightEvent = `data: ${JSON.stringify({
    type: "highlight_category",
    category: diagnosisHighlightCategory,
  })}\n\n`;
  controller.enqueue(encoder.encode(highlightEvent));
  console.log(`[Stream] Emitted highlight_category: "${diagnosisHighlightCategory}"`);
}
```

### Change 4 — Handle `highlight_category` SSE event in `useBobChat.ts`

**Location:** in the SSE stream parser in `streamChat`, alongside the other `parsed.type` handlers

```typescript
// Handle Brain diagnostic category highlight — scroll shelf to matched category
if (parsed.type === "highlight_category" && parsed.category) {
  console.log('[useBobChat] highlight_category event:', parsed.category);
  onHighlightPart?.(parsed.category);
  continue;
}
```

This uses the existing `onHighlightPart` callback, which in `Bob.tsx` calls `setHighlightedPartType(partType)` (with 8-second auto-clear), and in `MobileProductColumn.tsx` triggers a `scrollIntoView` on the matching category section. **No new frontend plumbing needed.**

---

## Data flow diagram

```text
User: "spongy pedal"
        │
        ▼ (symptom keyword detected → forced tool call)
  diagnose_symptom("spongy pedal")
        │
        ▼ query-brain API
  { partslot_description: "BRAKE FLUID", partslot_id: 3803,
    physics_title: "Vapour Lock", physics_logic: "..." }
        │
        ▼ (Change 1 — return _partslot_description in result)
  outer tool loop receives result with _partslot_description
        │
        ▼ (Change 2 — fetch filtered parts)
  retrieveParts(vehicleId, apiConfig, "BRAKE FLUID")
  → stores parts in _partsToEmit
  → stores "BRAKE FLUID" in _diagnosisHighlightCategory
        │
        ▼ SSE stream opens
  [parts_found]          → shelf renders BRAKE FLUID products
  [highlight_category]   → shelf auto-scrolls to BRAKE FLUID section
  [AI text stream]       → Bob explains Vapour Lock physics
```

---

## Edge cases and guard rails

| Scenario | Behaviour |
|---|---|
| Brain returns `no_match: true` | No parts fetch, no highlight, AI falls back gracefully |
| Brain has `partslot_description` but vehicle not confirmed | No parts fetch (guard: `vehicleIdForParts` check), highlight skipped |
| Full catalog already in `_partsToEmit` (500 parts) | Existing catalog preserved, only highlight emitted — no overwrite |
| `partslot_description` not in parts API (empty result) | No overwrite of existing shelf, no highlight emitted |
| Multiple entries in `diagnosis_trace` | Only first entry with `partslot_description` used (highest similarity, already sorted by API) |

---

## What does NOT change

- No widget frontend components change (Bob.tsx, MobileProductColumn, MobileBobLayout, etc.)
- No new SSE event types on the frontend — `highlight_category` reuses the existing `onHighlightPart` path
- No changes to `useSpeechSynthesis`, animation system, or PTT logic
- No changes to the test suite (edge function logic is not unit tested in the widget package)
- The `retrieve-parts` API call uses the exact `partslot_description` string as-is — no transformation needed

---

## Files to change

| File | Change |
|---|---|
| `supabase/functions/bob-chat/index.ts` | 4 targeted additions: (1) return `_partslot_description` from diagnose_symptom case, (2) fetch filtered parts after diagnose_symptom in outer loop, (3) emit `highlight_category` SSE event, (4) — |
| `packages/bob-widget/src/hooks/useBobChat.ts` | Handle `highlight_category` SSE event → call `onHighlightPart` |
