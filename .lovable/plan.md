
# Fix Plan: Variant Confirmation Flow + Speech Fallback Timeout

## Problem Summary

**Issue 1: Variant confirmation doesn't trigger parts/packages fetch**
When a REGO returns multiple vehicle variants (e.g., Toyota Altezza with 4 engine options), Bob asks the user to confirm which variant. When the user confirms (e.g., "the 2.0L one"), Bob says he's confirmed it but:
- The `_lookupVehicleId` is never set for multi-match scenarios
- The vehicle candidates array is not stored for later lookup
- When the AI emits `VEHICLE_CONFIRMED`, there's no way to match the user's choice to an actual vehicle_id from the original lookup
- Result: No parts/packages are fetched → empty shelf

**Issue 2: Speech fallback timeout too short**
The `[BobWidget] Speech fallback after 2s` warning indicates the 2-second timeout may be too short for ElevenLabs TTS to respond, especially on slower connections.

---

## Root Cause Analysis

### Multi-Vehicle Flow Gap

```text
Current flow (BROKEN):
┌─────────────────────────────────────────────────────────────┐
│ lookup_vehicle returns { vehicles: [A, B, C, D] }           │
│                                                             │
│ ❌ vehicleId = undefined (not set for multi-match)          │
│ ❌ _lookupVehicleId = undefined (never stored)              │
│ ❌ _multipleVehicleCandidates = undefined (vehicles lost!)  │
│ ✅ _multipleVehiclesFound = true                            │
│                                                             │
│ AI presents: "Is yours the 2.0L or the 3.0L?"               │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ User confirms: "the 2.0L one"                               │
│ AI emits: [VEHICLE_CONFIRMED:{"vehicle_id":12345,...}]      │
│                                                             │
│ ❌ storedVehicleId = undefined (was never set)              │
│ ❌ Cannot validate AI's vehicle_id against actual options   │
│ ❌ No parts/packages fetch triggered                        │
└─────────────────────────────────────────────────────────────┘
```

### Fix Required

Store the vehicle candidates when multiple matches are found, so when the AI later emits `VEHICLE_CONFIRMED`, we can:
1. Match the AI's choice to an actual vehicle from the candidates
2. Use the REAL vehicle_id from that candidate (not hallucinated)
3. Trigger parts/packages fetch

---

## Implementation

### Change 1: Store Vehicle Candidates for Multi-Match Scenarios

**File: `supabase/functions/bob-chat/index.ts`**

**Location: Lines 1730-1736 (multi-match handling)**

After setting `_multipleVehiclesFound = true`, also store the actual vehicle candidates:

```typescript
// Multiple matches without a confirmed vehicle - flag for frontend to show placeholders
else if (vehicleResult.vehicles?.length && vehicleResult.vehicles.length > 1) {
  console.log(`Multiple vehicle candidates found (${vehicleResult.vehicles.length}), AI will present options to customer`);
  // Flag that we have multiple matches - frontend will show placeholder service packages
  (conversationMessages as unknown as { _multipleVehiclesFound?: boolean })._multipleVehiclesFound = true;
  
  // NEW: Store the actual vehicle candidates for later variant confirmation
  // This enables matching the user's choice to a real vehicle_id
  (conversationMessages as unknown as { _multipleVehicleCandidates?: unknown[] })._multipleVehicleCandidates = vehicleResult.vehicles;
  console.log(`Stored ${vehicleResult.vehicles.length} vehicle candidates for variant confirmation`);
  
  // Don't set vehicleId - wait for customer to confirm
}
```

### Change 2: Match Confirmed Variant to Real Vehicle ID

**File: `supabase/functions/bob-chat/index.ts`**

**Location: Lines 1993-2007 (VEHICLE_CONFIRMED handling)**

After extracting `vehicleId` from AI's marker, try to match against stored candidates:

```typescript
if (vehicleConfirmedMatch) {
  try {
    const confirmedVehicle = JSON.parse(vehicleConfirmedMatch[1]);
    let vehicleId = confirmedVehicle.vehicle_id || confirmedVehicle.id;
    
    // CRITICAL: Override AI's potentially hallucinated vehicle_id with ACTUAL lookup result
    const storedVehicleId = (conversationMessages as unknown as { _lookupVehicleId?: number })._lookupVehicleId;
    const storedVehicleData = (conversationMessages as unknown as { _lookupVehicleData?: unknown })._lookupVehicleData;
    
    // NEW: For multi-match scenarios, match the AI's choice to stored candidates
    const storedCandidates = (conversationMessages as unknown as { _multipleVehicleCandidates?: Array<Record<string, unknown>> })._multipleVehicleCandidates;
    
    if (!storedVehicleId && storedCandidates && storedCandidates.length > 0) {
      console.log(`[Variant Confirmation] Matching AI's choice against ${storedCandidates.length} stored candidates`);
      
      // Try to match by vehicle_id first (if AI got it right)
      let matchedCandidate = storedCandidates.find(c => 
        (c.vehicle_id === vehicleId) || (c.id === vehicleId)
      );
      
      // If no ID match, try fuzzy matching by variant/engine characteristics
      if (!matchedCandidate && confirmedVehicle.variant) {
        matchedCandidate = storedCandidates.find(c => 
          String(c.variant || c.vehicle_name_nz || '').toLowerCase().includes(
            String(confirmedVehicle.variant).toLowerCase()
          )
        );
        console.log(`[Variant Confirmation] Fuzzy matched by variant: ${confirmedVehicle.variant}`);
      }
      
      // If still no match, try by engine size
      if (!matchedCandidate && confirmedVehicle.engine_size) {
        matchedCandidate = storedCandidates.find(c => 
          String(c.engine_size || c.cc_rating || '').includes(
            String(confirmedVehicle.engine_size).replace(/[^\d.]/g, '')
          )
        );
        console.log(`[Variant Confirmation] Fuzzy matched by engine size: ${confirmedVehicle.engine_size}`);
      }
      
      // If still no match but only one candidate with matching make/model, use it
      if (!matchedCandidate) {
        const makeModelMatches = storedCandidates.filter(c => 
          String(c.make || '').toLowerCase() === String(confirmedVehicle.make || '').toLowerCase() &&
          String(c.model || '').toLowerCase() === String(confirmedVehicle.model || '').toLowerCase()
        );
        if (makeModelMatches.length === 1) {
          matchedCandidate = makeModelMatches[0];
          console.log(`[Variant Confirmation] Single make/model match found`);
        }
      }
      
      if (matchedCandidate) {
        const realVehicleId = matchedCandidate.vehicle_id || matchedCandidate.id;
        if (realVehicleId && realVehicleId !== vehicleId) {
          console.warn(`[Variant Confirmation] AI used vehicle_id ${vehicleId}, actual candidate ID: ${realVehicleId}`);
          vehicleId = realVehicleId as number;
          confirmedVehicle.vehicle_id = realVehicleId;
        }
        // Merge in correct vehicle data from matched candidate
        Object.assign(confirmedVehicle, {
          make: matchedCandidate.make || confirmedVehicle.make,
          model: matchedCandidate.model || confirmedVehicle.model,
          year: matchedCandidate.year || matchedCandidate.start_year || confirmedVehicle.year,
          variant: matchedCandidate.variant || matchedCandidate.vehicle_name_nz || confirmedVehicle.variant,
          engine_size: matchedCandidate.engine_size || confirmedVehicle.engine_size,
          fuel_type: matchedCandidate.fuel_type || confirmedVehicle.fuel_type,
          cc_rating: matchedCandidate.cc_rating || confirmedVehicle.cc_rating,
          rego: matchedCandidate.plate || matchedCandidate.rego || confirmedVehicle.rego,
        });
        console.log(`[Variant Confirmation] Matched to candidate:`, matchedCandidate.vehicle_name_nz || matchedCandidate.variant);
        
        // Store as lookup data for streaming handler
        (conversationMessages as unknown as { _lookupVehicleId?: number })._lookupVehicleId = vehicleId;
        (conversationMessages as unknown as { _lookupVehicleData?: unknown })._lookupVehicleData = matchedCandidate;
      } else {
        console.warn(`[Variant Confirmation] Could not match AI's choice to any stored candidate, using AI's ID: ${vehicleId}`);
        // Fall back to first candidate if AI's ID seems invalid
        if (!vehicleId || vehicleId < 1000) {
          const fallback = storedCandidates[0];
          vehicleId = (fallback.vehicle_id || fallback.id) as number;
          confirmedVehicle.vehicle_id = vehicleId;
          console.warn(`[Variant Confirmation] AI ID invalid, falling back to first candidate: ${vehicleId}`);
        }
      }
    } else if (storedVehicleId && storedVehicleId !== vehicleId) {
      // Existing single-match override logic
      console.warn(`AI HALLUCINATED vehicle_id: ${vehicleId} - OVERRIDING with actual lookup ID: ${storedVehicleId}`);
      vehicleId = storedVehicleId;
      confirmedVehicle.vehicle_id = storedVehicleId;
      if (storedVehicleData) {
        Object.assign(confirmedVehicle, storedVehicleData);
      }
    }
    
    // ... rest of existing code (garage cross-reference, parts/packages fetch)
```

### Change 3: Increase Speech Fallback Timeout to 5 Seconds

**File: `packages/bob-widget/src/hooks/useBobChat.ts`**

**Location: Lines 723-739**

Change the timeout from 2000ms to 5000ms:

```typescript
fallbackTimeoutRef.current = setTimeout(() => {
  if (!speechStartedRef.current) {
    console.warn('[BobWidget] Speech fallback after 5s');
    onReadyToSpeak?.();
    
    if (!manualMode) {
      if (hasProductContent && onShowingProduct) {
        onShowingProduct();
      } else if (onStreamComplete) {
        onStreamComplete();
      } else {
        safeSetState(completeState);
        setTimeout(() => safeSetState(listenState), 3000);
      }
    }
  }
}, 5000);  // Changed from 2000 to 5000
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/bob-chat/index.ts` | Store vehicle candidates for multi-match; Match variant confirmation to real ID |
| `packages/bob-widget/src/hooks/useBobChat.ts` | Increase speech fallback timeout from 2s to 5s |

---

## Expected Behavior After Fix

### Multi-Vehicle Flow (FIXED)

```text
┌─────────────────────────────────────────────────────────────┐
│ lookup_vehicle returns { vehicles: [A, B, C, D] }           │
│                                                             │
│ ✅ _multipleVehiclesFound = true                            │
│ ✅ _multipleVehicleCandidates = [A, B, C, D] (NEW!)         │
│                                                             │
│ AI presents: "Is yours the 2.0L or the 3.0L?"               │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ User confirms: "the 2.0L one"                               │
│ AI emits: [VEHICLE_CONFIRMED:{"vehicle_id":12345,...}]      │
│                                                             │
│ ✅ Match "2.0L" to candidate B (engine_size: "2.0L")        │
│ ✅ Use candidate B's real vehicle_id: 42899                 │
│ ✅ Fetch parts for vehicle_id 42899                         │
│ ✅ Fetch service packages for vehicle_id 42899              │
│ ✅ Emit parts_found + service_packages_found events         │
│ ✅ Shelf displays full catalog                              │
└─────────────────────────────────────────────────────────────┘
```

### Speech Fallback

- Before: Warning after 2s, potentially cutting off slower TTS responses
- After: Warning after 5s, giving ElevenLabs more time to respond

---

## Verification Checklist

- [ ] Enter a REGO that returns multiple variants (e.g., "MKT21")
- [ ] Bob presents variant options to customer
- [ ] Customer confirms one variant (e.g., "the 2.0L one")
- [ ] Console shows `[Variant Confirmation] Matched to candidate: ...`
- [ ] Service packages appear on shelf
- [ ] Individual parts catalog appears on shelf
- [ ] No `[BobWidget] Speech fallback after 2s` warnings (or at least after 5s)
