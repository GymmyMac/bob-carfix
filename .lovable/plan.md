# Fix: Hallucinated Products + Shelf Not Scrolling (v3.2.12)

## Two Root Causes Found

### Issue 1: Hallucination — Follow-up bypass has NO shelf data

The v3.2.11 follow-up bypass correctly skips the tool loop for speed, but it also skips the shelf data injection. Here's the flow:

```text
Follow-up request ("tell me about front brake pads")
  → canBypassToolLoop = true (vehicle confirmed, no symptom/cart)
  → loopCount = maxLoops (skip tool loop)
  → _partsToEmit = [] (never populated)
  → _servicePackagesToEmit = [] (never populated)
  → displayedPackages.length === 0 → NO [SHELF DATA] injected
  → else branch: only injects cached brand context (if any)
  → LLM has ZERO product/price data → hallucinates "Bendix rotors"
```

**Suggested Fix:** On the follow-up bypass path, re-fetch the package summaries from the API (lightweight call, ~2s) and inject them as display context. Alternatively, have the **client send a compact shelf summary** with the request so the server doesn't need to re-fetch at all.  
  
The client-side approach is better for latency: the client already has all 500 parts and 6 service packages. We'll send a compact `shelfContext` field in the request body containing package titles+tiers+prices and part category names. The edge function injects this as a `[SHELF DATA]` system message on the bypass path.

### Issue 2: Scroll fails — Service packages have no scroll anchors

The word-scoring matcher correctly identifies "Front Brake Service" as the best match. `onHighlightPart("Front Brake Service")` fires. But in `MobileProductColumn.tsx`, the scroll effect at line 207 iterates `groupRefs.current` — which only contains refs for **product category sections** (line 843). Service package cards are rendered in a separate block (line 489) with NO ref registration.  
  
**Question/Suggestion:** Examine the volume of data being presented by the API, do we already have data that could be used to build/insert the shelf labels? e.g. Partslot name could be used to create dynamic anchors during page load, then when Bob references that part, a match can be made and the page scrolled to show that partslot. This approach would work across all vehicles and does not require additional 'heavy' data to be presented by the API. 

**Fix:** Register service package sections into `groupRefs` alongside product categories, so the existing scroll logic finds them.

---

## Implementation Plan

### File 1: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

**Add ref registration to service package cards** (around line 516):

```tsx
<div
  key={pkg.id}
  ref={(el) => { groupRefs.current[pkg.title] = el; }}  // ← ADD THIS
  className="overflow-hidden transition-all duration-300"
  ...
```

This is the minimal change. The existing scroll logic in the `highlightedPartType` useEffect already uses `matchesPartType` which will match "Front Brake Service" against the ref key.

### File 2: `packages/bob-widget/src/hooks/useBobChat.ts`

**Build and send a compact shelf context** with each follow-up request. Before calling the edge function, construct a summary from the products and service packages the client already has:

```typescript
// Build compact shelf context from client-side data
const shelfContext = shelfCategoriesRef?.current 
  ? Array.from(shelfCategoriesRef.current).join(', ')
  : '';
```

Send this as a new `shelfContext` field in the request body alongside messages.

### File 3: `supabase/functions/bob-chat/index.ts`

**On the follow-up bypass path**, when `displayedPackages` is empty but `effectiveVehicleContext` exists:

1. Read the `shelfContext` string from the request body
2. Re-fetch service packages from the API (they're cached server-side, ~1s) to get actual tier prices
3. Inject the compact summary as `[SHELF DATA]` so the LLM knows what's actually on the shelf

This prevents hallucination by giving the LLM real product data to reference.

### File 4: Version bump files

- `packages/bob-widget/src/version.ts` → 3.2.12
- `packages/bob-widget/package.json` → 3.2.12
- `packages/bob-widget/CHANGELOG.md` → document fixes

## Files Changed


| File                      | Change                                                                 |
| ------------------------- | ---------------------------------------------------------------------- |
| `MobileProductColumn.tsx` | Add ref to service package cards so scroll anchors work                |
| `useBobChat.ts`           | Send compact shelf context with follow-up requests                     |
| `bob-chat/index.ts`       | Re-fetch package summaries on follow-up bypass; inject as [SHELF DATA] |
| `version.ts`              | Bump to 3.2.12                                                         |
| `package.json`            | Bump to 3.2.12                                                         |
| `CHANGELOG.md`            | Document both fixes                                                    |


## Expected Impact

- **Hallucination**: Eliminated — LLM always has real shelf data, even on fast bypass path
- **Scroll**: Service packages become scrollable anchors alongside product categories
- **Latency**: ~1-2s added for package re-fetch on follow-ups (still far faster than the old 30s tool loop)