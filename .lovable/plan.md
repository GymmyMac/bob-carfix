
# Comprehensive Fix: Data Flow + Z-Layer Issues

## Issues Identified

### Issue 1: Bob Behind Service Packages (Z-Layer)
Looking at the screenshot, Bob (z-60) appears behind the product column (z-30). This is a CSS stacking context issue where the product column's parent container creates a new stacking context that places it above Bob despite lower z-index.

**Root Cause**: The `MobileProductColumn` is a sibling to `MobileBobCharacter` within `MobileBobLayoutCore`, but both are inside `position: absolute` containers. The product column's `overflow-y-auto` creates a new stacking context that ignores the z-index hierarchy.

**Fix Required**: Increase product column z-index to z-50 to maintain proper layering while keeping it below Bob (z-60).

---

### Issue 2: No Products/Packages After Variant Confirmation (CRITICAL)

**Evidence from logs:**
```
Stored 4 vehicle candidates for variant confirmation
Emitted multiple_vehicles_found event
Emitted no_parts_found event  ← PROBLEM!
```

**Root Cause Analysis:**
The VEHICLE_CONFIRMED marker detection happens in the **streaming phase** (after AI generates final response), but:
1. The AI may NOT emit the marker when confirming a variant verbally
2. Even if marker is detected, the parts/packages fetch runs but the results are NOT being stored/emitted

Looking at the code flow:

```
User: "I have the 2.0L one"
     ↓
AI processes (no tool calls - just conversational response)
     ↓
AI says: "Great, the 2.0L Altezza! Let me get your parts..." 
     ↓ 
Should emit: [VEHICLE_CONFIRMED:{"vehicle_id":12345,...}]
     ↓
Backend detects marker → fetches parts/packages → stores in _partsToEmit
     ↓
Streaming phase → emits parts_found SSE event
```

**The gap**: When AI confirms verbally without using `lookup_vehicle` tool, the variant confirmation logic runs BUT the fetched parts/packages are stored AFTER the streaming transform starts, so they're never emitted!

The key issue is at lines 2120-2156 in bob-chat:
- Parts/packages are fetched and stored in `_partsToEmit` / `_servicePackagesToEmit`
- BUT this happens during the "No tool calls - final response" phase
- The streaming transform was already started and `partsToEmit` variable was captured BEFORE the fetch completed

---

## Fix Plan

### File 1: `supabase/functions/bob-chat/index.ts`

**Change A: Ensure VEHICLE_CONFIRMED detection triggers parts/packages emission**

The issue is that when `VEHICLE_CONFIRMED` is detected in the final AI response, parts are fetched but stored in a way that the streaming handler can't access them. The fix is to delay streaming until after VEHICLE_CONFIRMED processing.

Current problematic flow:
```typescript
// Line ~1993-2160: VEHICLE_CONFIRMED detection and parts fetch
if (vehicleConfirmedMatch) {
  // ... fetch parts and packages
  (conversationMessages as { _partsToEmit })._partsToEmit = allParts.parts;
}

// Line ~2220: Start streaming
const transformedStream = new ReadableStream({
  async start(controller) {
    const partsToEmit = conversationMessages._partsToEmit; // ← Captured here, but fetch not complete!
```

**Fix**: Move the `partsToEmit` capture INSIDE the streaming handler's start function, after async fetch completes:

```typescript
// Before line 2230 (inside stream start):
// Re-check for parts after VEHICLE_CONFIRMED processing
const partsToEmit = (conversationMessages as { _partsToEmit?: unknown[] })._partsToEmit;
const servicePackagesToEmit = (conversationMessages as { _servicePackagesToEmit?: unknown[] })._servicePackagesToEmit;
```

Wait - looking more carefully, the `partsToEmit` is ALREADY captured correctly at line 2226 which is AFTER the VEHICLE_CONFIRMED processing block (lines 1993-2160). So the variable capture timing is correct.

The REAL issue is that when the AI doesn't emit a VEHICLE_CONFIRMED marker (just confirms verbally), no parts are fetched at all!

**NEW Fix Required: Prompt Engineering + Fallback Detection**

Add a fallback mechanism: if AI's response mentions confirming a vehicle variant AND we have stored candidates, trigger parts/packages fetch.

### File 2: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

**Change B: Fix z-index to ensure proper layering**

Line 325: Change `z-30` to `z-50` to ensure product column stays below Bob (z-60) but above background (z-0)

---

## Detailed Code Changes

### Change 1: Add Fallback Vehicle Confirmation Detection
**File: `supabase/functions/bob-chat/index.ts`**
**Location: After line ~2160 (after VEHICLE_CONFIRMED block)**

Add detection for verbal variant confirmation:
```typescript
// FALLBACK: If AI confirmed a variant verbally but didn't emit marker,
// detect confirmation phrases and use stored candidates
if (!vehicleConfirmedMatch && storedCandidates?.length > 0) {
  const confirmPhrases = [
    /that's (the one|correct|right)/i,
    /got it.*your.*(car|vehicle)/i,
    /perfect.*let me (get|find|load)/i,
    /confirmed.*your/i,
    /sorted.*your/i,
    /your.*altezza|corolla|camry|hilux/i  // Vehicle names as confirmation
  ];
  
  const aiContent = assistantMessage?.content || "";
  const isVerbalConfirmation = confirmPhrases.some(p => p.test(aiContent));
  
  if (isVerbalConfirmation) {
    console.log('[Fallback Confirmation] Detected verbal confirmation without marker');
    // Use first candidate or try to match from AI's response
    const fallbackVehicle = storedCandidates[0];
    const vehicleId = fallbackVehicle.vehicle_id || fallbackVehicle.id;
    
    if (vehicleId) {
      // Fetch parts and packages
      const allParts = await retrieveParts(vehicleId, apiConfig);
      if (allParts.success && allParts.parts?.length > 0) {
        (conversationMessages as any)._partsToEmit = allParts.parts;
      }
      
      const pkgsResult = await retrieveServicePackages(vehicleId, apiConfig);
      if (pkgsResult.success && pkgsResult.packages?.length > 0) {
        const displayable = filterDisplayablePackages(pkgsResult.packages);
        (conversationMessages as any)._servicePackagesToEmit = displayable;
      }
      
      // Also emit vehicle identified event
      (conversationMessages as any)._confirmedVehicle = {
        vehicle_id: vehicleId,
        ...fallbackVehicle
      };
    }
  }
}
```

### Change 2: Strengthen AI Prompt for VEHICLE_CONFIRMED Emission
**File: `supabase/functions/bob-chat/index.ts`**
**Location: System prompt section**

Ensure AI is instructed to ALWAYS emit the marker:
```
CRITICAL: When a customer CONFIRMS a vehicle variant (says "yes", "that one", "the 2L", etc.), 
you MUST emit [VEHICLE_CONFIRMED:{"vehicle_id":ID,"make":"...","model":"..."}] marker.
This triggers the parts catalog to load. WITHOUT the marker, no parts will appear!
```

### Change 3: Fix Z-Index Layering
**File: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`**
**Location: Line 325**

```typescript
// Before
className={`absolute overflow-y-auto overflow-x-hidden z-30 flex flex-col...`}

// After - z-50 keeps products below Bob (z-60) but above background
className={`absolute overflow-y-auto overflow-x-hidden z-50 flex flex-col...`}
```

---

## Process Flow Diagram

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                     VARIANT CONFIRMATION FLOW (FIXED)                      │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  1. User enters REGO (e.g., "MKT21")                                       │
│     ↓                                                                      │
│  2. AI calls lookup_vehicle tool                                           │
│     ↓                                                                      │
│  3. API returns multiple variants                                          │
│     → Store in _multipleVehicleCandidates ✓                               │
│     → Emit multiple_vehicles_found SSE ✓                                   │
│     ↓                                                                      │
│  4. AI presents variants to user                                           │
│     ↓                                                                      │
│  5. User confirms (e.g., "the 2.0L one")                                   │
│     ↓                                                                      │
│  6A. AI emits [VEHICLE_CONFIRMED:{...}] marker (PREFERRED)                 │
│      → Match to stored candidates                                          │
│      → Fetch parts & packages                                              │
│      → Store in _partsToEmit & _servicePackagesToEmit                     │
│      → Emit vehicle_identified SSE                                         │
│      → Emit service_packages_found SSE                                     │
│      → Emit parts_found SSE                                               │
│                                                                            │
│  6B. AI confirms verbally WITHOUT marker (FALLBACK) ← NEW!                 │
│      → Detect confirmation phrases                                         │
│      → Use first stored candidate                                          │
│      → Fetch parts & packages                                              │
│      → Emit same SSE events                                               │
│     ↓                                                                      │
│  7. Frontend receives parts_found & service_packages_found                 │
│     → Updates displayedParts & displayedPackages state                     │
│     → Product shelf renders with full catalog                              │
│                                                                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Z-Index Layer Stack (After Fix)

| Layer | Z-Index | Component | Notes |
|-------|---------|-----------|-------|
| Background | z-0 | Backdrop image | Shop interior |
| Product Column | z-50 | MobileProductColumn | ← Fixed from z-30 |
| Bob Character | z-60 | MobileBobCharacter | Stays in front of products |
| Counter Overlay | z-70 | Counter image | Theatrical layer |
| Chat Drawer | z-80+ | MobileChatDrawer | Always on top |

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/bob-chat/index.ts` | Add fallback confirmation detection + strengthen AI prompt |
| `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx` | Fix z-index from z-30 to z-50 |

---

## Verification Checklist

After implementation:
- [ ] Enter REGO with multiple variants (e.g., "MKT21")
- [ ] Bob presents variant options
- [ ] Confirm a variant verbally (e.g., "the 2.0L one")
- [ ] Console shows `[Fallback Confirmation]` or `[Variant Confirmation]` log
- [ ] Service packages appear on shelf
- [ ] Individual parts catalog appears on shelf
- [ ] Bob character is visually IN FRONT of product cards
- [ ] Counter overlay is IN FRONT of both Bob and products
