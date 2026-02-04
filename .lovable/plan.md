# Fix Vehicle ID Selection: TecDoc vs CarJam Mapping

## Status: ✅ IMPLEMENTED & DEPLOYED

## Problem Summary (FIXED)

The system was incorrectly using the CarJam internal row `id` for parts lookups instead of the TecDoc `vehicle_id` from the `vehicles[]` array.

### Root Cause
```typescript
// OLD CODE - WRONG
vehicle_id: (vehicle.vehicle_id || vehicle.id) as number  // Falls back to CarJam id!

// NEW CODE - CORRECT  
vehicle_id: tecDocVehicle.vehicle_id as number  // ONLY uses TecDoc vehicle_id
```

---

## Changes Made

### 1. Updated VehicleCandidate Interface
- `vehicle_id` is now `number | null` (null when not in TecDoc catalog)
- Added `carjam_id?: number` field to store CarJam row ID separately
- Added additional fields: `power`, `body_style`, `kw`, `cc`

### 2. Fixed Vehicle Selection Logic (Lines 1929-2018)
- **Single TecDoc match**: Uses `vehicles[0].vehicle_id` from TecDoc array
- **Multiple TecDoc matches**: Maps candidates using ONLY TecDoc `vehicle_id`
- **CarJam only (no TecDoc)**: Sets `vehicle_id: null`, flags `noTecDocMatch = true`

### 3. Added noTecDocMatch Handling (Lines 2469-2518)
When a vehicle is found in CarJam but has NO TecDoc mapping:
- Skips parts fetch entirely (would fail anyway)
- Logs `vehicle_not_in_parts_db` error for analytics
- Injects system prompt instructing AI to:
  - Acknowledge the vehicle
  - Apologize for catalog gap
  - Direct to carfix.co.nz
  - Use varied Kiwi-friendly phrasing

### 4. Voice/Text Sync (packages/bob-widget/src/hooks/useBobChat.ts)
When `bob_searching` event is received:
- Transcript is now added to chat messages
- Voice and text are synchronized
- Error messages appear AFTER the search announcement

---

## Testing Verification

Test with REGO "AMA993" (Toyota RAV4):
1. If TecDoc match exists: Parts should load with correct `vehicle_id`
2. If CarJam only: Bob says "not in parts catalog" and directs to website
3. Voice/text should match throughout the flow

### Expected Logs (TecDoc match found)
```
[Vehicle Lookup] Response structure: CarJam id=12, TecDoc vehicles=1
[Vehicle Lookup] TecDoc vehicle_ids: 42899
[Forced REGO Lookup] Single TecDoc match: vehicle_id=42899 (CarJam id=12)
```

### Expected Logs (No TecDoc match)
```
[Vehicle Lookup] Response structure: CarJam id=12, TecDoc vehicles=0
[Forced REGO Lookup] CarJam found plate AMA993 but no TecDoc matches
[Forced REGO Lookup] Marked noTecDocMatch=true for AMA993
[Deterministic Fetch] Skipping parts fetch - noTecDocMatch=true
```

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/bob-chat/index.ts` | VehicleCandidate interface, vehicle ID selection logic, noTecDocMatch handling |
| `packages/bob-widget/src/hooks/useBobChat.ts` | Added transcript to chat messages on bob_searching event |

---

## Technical Summary

- **CarJam `id`**: Internal row identifier - NEVER use for parts lookup
- **TecDoc `vehicle_id`**: From `vehicles[]` array - ALWAYS use for parts lookup
- System now gracefully handles vehicles registered in NZ but not in the TecDoc parts catalog
