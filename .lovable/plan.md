
# Fix Vehicle ID Selection: TecDoc vs CarJam Mapping

## Problem Summary

The CARFIX team has clarified the exact issue:

### API Response Structure
```json
{
  "success": true,
  "vehicle": { "id": 12, "plate": "AMA993", "make": "TOYOTA", ... },  // ← CarJam data (id is internal row ID)
  "vehicles": [                                                       // ← TecDoc matches (use vehicle_id from here!)
    { "vehicle_id": 42899, "make": "TOYOTA", "model": "RAV4", "score": 85, ... }
  ]
}
```

### The Bug Location
**Line 1964** in `bob-chat/index.ts`:
```typescript
vehicle_id: (vehicle.vehicle_id || vehicle.id) as number,
```

When `vehicles[]` is empty OR when the code selects from `vehicle` (CarJam object) instead of `vehicles[0]` (TecDoc match), it uses the CarJam row ID instead of the TecDoc vehicle_id.

### Current Logic Flaw (Lines 1952-1954)
```typescript
} else if (singleVehicle || vehicles.length === 1) {
  // Single match - auto-confirm
  const vehicle = singleVehicle || vehicles[0];  // ← Problem: uses CarJam 'singleVehicle' first!
```

If `lookupResult.vehicle` exists (the CarJam record), it's used instead of `lookupResult.vehicles[0]` (the TecDoc match). The CarJam record has `id: 12` but no `vehicle_id`.

---

## Solution

### 1. Prioritize TecDoc `vehicles[]` Array Over CarJam `vehicle`

**File**: `supabase/functions/bob-chat/index.ts`

**Lines 1952-1977 - Fix the vehicle selection logic:**

```typescript
} else if (vehicles.length === 1) {
  // ✅ ALWAYS use the TecDoc vehicle from vehicles[] array
  const tecDocVehicle = vehicles[0];
  const carJamVehicle = singleVehicle; // Keep CarJam data for display fields
  
  // Year validation warning
  const displayYear = carJamVehicle?.year_of_manufacture || tecDocVehicle.start_year;
  if (carJamVehicle?.year_of_manufacture && tecDocVehicle.start_year && tecDocVehicle.end_year) {
    if (carJamVehicle.year_of_manufacture < tecDocVehicle.start_year || 
        carJamVehicle.year_of_manufacture > tecDocVehicle.end_year) {
      console.warn(`[Year Validation] Mismatch: year_of_manufacture=${carJamVehicle.year_of_manufacture} outside TecDoc range ${tecDocVehicle.start_year}-${tecDocVehicle.end_year}`);
    }
  }
  
  forcedSingleVehicle = {
    // ✅ CRITICAL: Use vehicle_id from TecDoc vehicles[] array
    vehicle_id: tecDocVehicle.vehicle_id as number,
    carjam_id: carJamVehicle?.id as number | undefined, // Store CarJam ID separately for reference
    make: (tecDocVehicle.make || carJamVehicle?.make) as string,
    model: (tecDocVehicle.model || carJamVehicle?.model) as string,
    // Display year from CarJam (actual registration), internal matching from TecDoc
    year: displayYear as number,
    year_of_manufacture: carJamVehicle?.year_of_manufacture as number | undefined,
    start_year: tecDocVehicle.start_year as number | undefined,
    end_year: tecDocVehicle.end_year as number | undefined,
    variant: (tecDocVehicle.variant || tecDocVehicle.vehicle_name_nz) as string,
    cc_rating: (tecDocVehicle.cc_rating || carJamVehicle?.cc_rating) as number,
    fuel_type: (tecDocVehicle.fuel_type || carJamVehicle?.fuel_type) as string,
    engine_code: tecDocVehicle.engine_code as string | undefined,
    plate: extractedRego,
  };
  console.log(`[Forced REGO Lookup] Single TecDoc match: vehicle_id=${forcedSingleVehicle.vehicle_id} (CarJam id=${carJamVehicle?.id})`);
  
} else if (singleVehicle && vehicles.length === 0) {
  // ⚠️ CarJam found vehicle but NO TecDoc matches - cannot look up parts
  console.warn(`[Forced REGO Lookup] CarJam found plate ${extractedRego} but no TecDoc matches - vehicle not in parts catalog`);
  
  // Still store the vehicle for display, but mark as no TecDoc ID
  forcedSingleVehicle = {
    vehicle_id: null, // ← Explicitly null - no TecDoc mapping
    carjam_id: singleVehicle.id as number,
    make: singleVehicle.make as string,
    model: singleVehicle.model as string,
    year: singleVehicle.year_of_manufacture as number,
    year_of_manufacture: singleVehicle.year_of_manufacture as number,
    variant: singleVehicle.submodel as string,
    cc_rating: singleVehicle.cc_rating as number,
    fuel_type: singleVehicle.fuel_type as string,
    plate: extractedRego,
  };
  
  // Flag this for error handling - skip parts fetch
  (conversationMessages as unknown as { _noTecDocMatch?: boolean })._noTecDocMatch = true;
}
```

### 2. Update `forcedCandidates` Mapping (Lines 1935-1950)

Ensure `vehicle_id` is taken from the TecDoc record:

```typescript
forcedCandidates = vehicles.map((v: any) => ({
  vehicle_id: v.vehicle_id,  // ← ONLY use vehicle_id from TecDoc, never fall back to id
  vehicle_name_nz: v.vehicle_name_nz,
  make: v.make,
  model: v.model,
  start_year: v.start_year,
  end_year: v.end_year,
  year: v.year,
  year_of_manufacture: v.year_of_manufacture, // May be inherited from CarJam lookup
  engine_code: v.engine_code,
  cc_rating: v.cc_rating,
  fuel_type: v.fuel_type,
  variant: v.variant,
  score: v.score,
  plate: extractedRego,
}));
```

### 3. Update VehicleCandidate Interface (Lines ~125-140)

```typescript
interface VehicleCandidate {
  vehicle_id: number | null;   // TecDoc ID - null if not in catalog
  carjam_id?: number;          // CarJam plate record ID (internal reference only)
  vehicle_name_nz?: string;
  make: string;
  model: string;
  start_year?: number;
  end_year?: number;
  year?: number;
  year_of_manufacture?: number;
  engine_code?: string;
  cc_rating?: number;
  fuel_type?: string;
  variant?: string;
  score?: number;
  plate?: string;
  power?: number;
  body_style?: string;
  kw?: number | null;
  cc?: number | null;
}
```

### 4. Skip Parts Fetch When No TecDoc ID (Lines ~2480-2520)

Add check before attempting parts fetch:

```typescript
// Check if we have a valid TecDoc vehicle_id
const hasValidTecDocId = vehicleId && vehicleId > 0;
const noTecDocMatch = (conversationMessages as unknown as { _noTecDocMatch?: boolean })._noTecDocMatch;

if (!hasValidTecDocId || noTecDocMatch) {
  console.log(`[Deterministic Fetch] Skipping parts fetch - no valid TecDoc vehicle_id (vehicleId=${vehicleId}, noTecDocMatch=${noTecDocMatch})`);
  partsResult = { success: false, parts: [], errorType: 'vehicle_not_in_parts_db' };
  packagesResult = { success: false, packages: [] };
  
  // Log for analytics
  await logErrorEvent('vehicle_not_in_parts_db', {
    vehicleId: effectiveVehicleContext?.carjam_id,
    make: effectiveVehicleContext?.make,
    model: effectiveVehicleContext?.model,
    rego: effectiveVehicleContext?.plate
  }, { reason: 'no_tecdoc_mapping' });
} else {
  // Proceed with normal parts fetch
  // ... existing fetch logic
}
```

### 5. Add Enhanced Logging

Add clear logging to trace the ID selection:

```typescript
// After vehicle lookup response
console.log(`[Vehicle Lookup] Response structure: CarJam id=${singleVehicle?.id}, TecDoc vehicles=${vehicles.length}`);
if (vehicles.length > 0) {
  console.log(`[Vehicle Lookup] TecDoc vehicle_ids: ${vehicles.map((v: any) => v.vehicle_id).join(', ')}`);
}
```

---

## Voice/Text Mismatch Fix

### 6. Add Searching Transcript to Chat Messages

**File**: `packages/bob-widget/src/hooks/useBobChat.ts`

**Lines ~746-760 - Add transcript to messages when `bob_searching` event received:**

```typescript
// Handle bob_searching event - play audio AND show transcript
if (parsed.type === "bob_searching" && parsed.audio_url) {
  console.log('[useBobChat] Bob searching:', parsed.search_type, parsed.clip_key);
  
  // ✅ ADD transcript to chat messages so text matches voice
  if (parsed.transcript) {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      // Only add if not already the last message
      if (last?.role !== "assistant" || last?.content !== parsed.transcript) {
        return [...prev, { role: "assistant", content: parsed.transcript }];
      }
      return prev;
    });
  }
  
  // Queue the audio for sequential playback
  searchingAudioQueueRef.current.push(parsed.audio_url);
  
  // Start playing if not already
  if (!isPlayingSearchingRef.current && !isMuted) {
    playNextSearchingAudio();
  }
  
  continue;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/bob-chat/index.ts` | Fix vehicle ID selection (TecDoc vs CarJam), update interface, add no-TecDoc handling |
| `packages/bob-widget/src/hooks/useBobChat.ts` | Add searching transcript to chat messages |

---

## Testing Verification

After implementation:

1. **REGO "AMA993"** (Toyota RAV4):
   - If TecDoc match exists in `vehicles[]`: Parts should load using `vehicle_id` from that array
   - If only CarJam record exists (`vehicles[]` empty): Bob should say "not in parts catalog" and direct to website
   - Log should show: `[Vehicle Lookup] Response structure: CarJam id=12, TecDoc vehicles=X`

2. **Voice/Text Sync**:
   - When "parts_searching" audio plays, the transcript should appear in chat
   - Error messages appear as new message AFTER the search announcement

3. **Log Verification**:
   - `[Forced REGO Lookup] Single TecDoc match: vehicle_id=42899 (CarJam id=12)` (not `vehicle_id=12`)

---

## Technical Summary

The CARFIX team confirmed the architecture:
- **CarJam `id`**: Internal row identifier for NZ plate records - NEVER use for parts lookup
- **TecDoc `vehicle_id`**: From `vehicles[]` array - ALWAYS use for parts lookup

The current code incorrectly falls back to `vehicle.id` (CarJam) when `vehicle.vehicle_id` is undefined. The fix ensures we ONLY use `vehicle_id` from the `vehicles[]` array (TecDoc matches), and handle the case where no TecDoc matches exist gracefully.
