
# Deep Diagnosis: Bob REGO Processing + Variant Confirmation + Vehicle Bar Regression

## What You Experienced (Failure Timeline)

### Conversation Flow
1. **User message 1**: `" mkt21 I need some front brake pads"`
   - ✅ Backend detected REGO pattern: `[REGO Detection] Found registration pattern in: " mkt21..."`
   - ❌ BUT the AI (Gemini) did NOT call `lookup_vehicle` tool
   - ❌ AI responded: `"Sweet as, mate. What's your rego so I can find the right pads for your vehicle?"`
   - **BUG**: Even though backend detected the REGO, the AI model ignored it

2. **User message 2**: `"I just gave you my rego"`
   - ❌ AI still didn't process it
   - ❌ AI responded: `"My apologies, mate! It looks like I don't have your rego on file..."`
   - **BUG**: AI not reading its own conversation context properly

3. **User message 3**: `"mkt21"`
   - ✅ Backend detected REGO again
   - ✅ AI finally called `lookup_vehicle` with `{"plate":"MKT21"}`
   - ✅ Vehicle lookup returned 4 variants
   - ✅ Candidates stored: `Stored 4 candidates for emission`
   - ❌ AI confirmed verbally BUT never asked user to select variant
   - ✅ Fallback confirmation triggered: `[Fallback Confirmation] Detected verbal confirmation`
   - ✅ Service packages fetched: `7 packages`
   - ❌ **Parts fetch failed**: `[retrieveParts] Failed: 500 {"error":"Vehicle not found in the database"}`

## Root Causes Identified

### Issue 1: AI Model Not Calling Tools on First REGO Detection
**Symptom**: User provides REGO in their message, backend detects it, but AI doesn't call `lookup_vehicle`

**Root Cause**: The system prompt instructs the AI to call `lookup_vehicle`, but:
- The AI (Gemini) is not reliably calling tools when REGO is embedded in a longer sentence
- The canned response system correctly bypasses the "need_rego" canned response when REGO is detected
- But then the AI STILL doesn't call the tool

**Fix Required**: Force the tool call automatically when REGO is detected in user message BEFORE sending to AI

### Issue 2: Vehicle ID Mismatch Causing Parts API Failure
**Symptom**: `[retrieveParts] Failed: 500 {"error":"Vehicle not found in the database"}`

**Root Cause**: The vehicle lookup returns variant candidates with `vehicle_id=5002`, but:
- This ID exists in the **internal TecDoc mapping** (for service bundles)
- But the **external CARFIX retrieve-parts API** doesn't recognize this vehicle ID
- The retrieve-parts API at `flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/retrieve-parts` expects a different vehicle identifier

**Evidence from logs**:
```
[Fallback Confirmation] Using first stored candidate: vehicle_id=5002
[retrieveParts] Fetching parts for vehicle: 5002 (full catalog)
[retrieveParts] Response status: 500
[retrieveParts] Failed: 500 {"error":"Vehicle not found in the database"}
```

**Fix Required**: Verify the correct vehicle ID field is being passed - may need `id` (CarJam) vs `vehicle_id` (TecDoc) reconciliation

### Issue 3: Separate Vehicle Bar (UI Regression)
**Symptom**: A separate "1998 TOYOTA ALTEZZA" bar appears at the top instead of being integrated into the shelf header

**Root Cause**: The `MobileBobLayoutCore.tsx` renders a separate Vehicle Context Bar (lines 187-232) when `vehicle && !isEmbedded`:
```tsx
{/* Vehicle Context Bar */}
{vehicle && !isEmbedded && (
  <div style={{ position: 'absolute', top: '8px', ... }}>
```

While the shelf ALSO has its own header showing the vehicle name (line 374-376):
```tsx
<span>{isResearching ? 'Updating...' : vehicleDisplayName}</span>
```

**Fix Required**: Remove the separate Vehicle Context Bar and rely only on the shelf header for vehicle display

### Issue 4: Multi-Variant Flow Not Prompting User to Select
**Symptom**: When 4 variants are found, Bob confirms verbally without asking user to choose

**Root Cause**: 
- The fallback confirmation regex matches Bob's verbal confirmation too eagerly
- Patterns like `/your\s+\d{4}\s+\w+/i` (e.g., "your 1998 Toyota") trigger confirmation
- Bob says "She's a TOYOTA ALTEZZA, sweet as" which triggers fallback
- System uses first candidate (highest score) automatically without user selection

**Fix Required**: Tighten fallback confirmation patterns to NOT trigger when multiple vehicles are still pending

---

## Flowchart: Where Your Call Failed

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER MESSAGE: "mkt21 I need some front brake pads"                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  REGO DETECTION CHECK                                                        │
│  containsRegoPattern(" mkt21 I need...") → TRUE ✅                          │
│  Log: "[REGO Detection] Found registration pattern..."                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  CANNED RESPONSE CHECK                                                       │
│  isVehicleSpecificRequest? TRUE (has "brake")                               │
│  hasVehicleContext? FALSE                                                   │
│  userProvidedRego? TRUE (detected above)                                    │
│  ∴ SKIP canned "need_rego" → proceed to AI ✅                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  DETERMINISTIC VARIANT CHECK                                                 │
│  vehicleCandidates from client? EMPTY (first message)                       │
│  vehicleContext? NONE                                                       │
│  ∴ No deterministic match possible ✅                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI GATEWAY CALL (Gemini 2.5 Flash)                                         │
│  System prompt includes: "Use lookup_vehicle when customer provides rego"   │
│                                                                              │
│  ❌ FAILURE POINT #1: AI DID NOT CALL lookup_vehicle                        │
│  AI responded: "Sweet as, mate. What's your rego?"                          │
│                                                                              │
│  WHY: AI model unreliably recognizes REGO in longer sentences               │
│       The REGO "mkt21" was embedded in " mkt21 I need some front brake..."  │
│       Leading space and sentence context confused the model                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    (User had to repeat REGO twice more)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  USER MESSAGE: "mkt21" (third attempt - standalone)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI FINALLY CALLS lookup_vehicle ✅                                          │
│  Tool call: lookup_vehicle {"plate":"MKT21"}                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  VEHICLE LOOKUP RESULT                                                       │
│  4 variants found (Toyota Altezza SXE10 with different engine specs)        │
│  Candidates stored in _multipleVehicleCandidates                            │
│  _multipleVehiclesFound = true                                              │
│  _vehicleCandidatesToEmit = [4 candidates]                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI FINAL RESPONSE                                                           │
│  "She's a TOYOTA ALTEZZA, sweet as. For front brake..."                     │
│                                                                              │
│  ❌ FAILURE POINT #2: AI did not ask user to select variant                 │
│  AI assumed the first/best match was correct                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FALLBACK CONFIRMATION DETECTION                                             │
│  Regex patterns checked against: "She's a TOYOTA ALTEZZA, sweet as..."      │
│  /sweet\s*as/i → MATCH ✅                                                    │
│                                                                              │
│  ❌ FAILURE POINT #3: Fallback triggered when it shouldn't have             │
│  Log: "[Fallback Confirmation] Detected verbal confirmation in AI response" │
│  Using first stored candidate: vehicle_id=5002                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PARTS AND PACKAGES FETCH                                                    │
│                                                                              │
│  ✅ Service packages: SUCCESS (7 packages via calculate-service-bundles)    │
│                                                                              │
│  ❌ FAILURE POINT #4: Parts fetch failed                                     │
│  [retrieveParts] Fetching parts for vehicle: 5002                           │
│  [retrieveParts] Response status: 500                                       │
│  [retrieveParts] Failed: 500 {"error":"Vehicle not found in the database"}  │
│                                                                              │
│  WHY: vehicle_id=5002 is TecDoc ID, not recognized by external parts API    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STREAM EMISSION                                                             │
│  ✅ vehicle_identified: {vehicle_id: 5002, make: TOYOTA, model: ALTEZZA}    │
│  ✅ service_packages_found: 7 packages                                       │
│  ❌ no_parts_found (emitted because parts array is empty)                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND RESULT                                                             │
│  ✅ Vehicle identified → vehicle state updated                               │
│  ✅ Service packages displayed on shelf (if rendered)                        │
│  ❌ No parts displayed (partsToEmit was empty)                               │
│  ❌ Separate vehicle bar appears (duplicate UI element)                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Fix 1: Force Tool Call When REGO Detected
**File: `supabase/functions/bob-chat/index.ts`**

Add automatic tool call injection when REGO is detected in user message:

Before calling the AI gateway, if `containsRegoPattern(lastUserMessage)` is TRUE and we don't have a `vehicleContext`:
1. Extract the REGO from the message using a capture regex
2. Execute `lookup_vehicle` directly (bypassing AI decision)
3. Process the result and store candidates
4. Add a system message: "Vehicle lookup completed for {REGO}"
5. Then let AI generate the response based on the result

This removes the AI's unreliable decision-making from the REGO detection loop.

### Fix 2: Correct Vehicle ID for Parts API
**File: `supabase/functions/bob-chat/index.ts`**

Investigate and fix the vehicle ID mismatch:
1. Log both `vehicle.id` (CarJam) and `vehicle.vehicle_id` (TecDoc) from lookup result
2. Determine which ID the parts API expects (likely needs the CarJam `id`, not TecDoc `vehicle_id`)
3. If both IDs are present, try the secondary ID on 500 error

### Fix 3: Remove Duplicate Vehicle Bar
**File: `packages/bob-widget/src/components/mobile/MobileBobLayoutCore.tsx`**

Remove the standalone Vehicle Context Bar (lines 187-232) since the shelf header already displays the vehicle name. The shelf header at line 374-376 already shows the vehicle make/model.

### Fix 4: Prevent False Fallback Confirmation on Multi-Variant
**File: `supabase/functions/bob-chat/index.ts`**

Tighten the fallback confirmation logic:
1. Check if `_multipleVehiclesFound` is true AND `_multipleVehicleCandidates.length > 1`
2. If so, ONLY trigger fallback if user explicitly selects (option number, engine code, etc.)
3. Remove overly broad patterns like `/sweet\s*as/i`, `/nice\s*one/i` from initial confirmation

Instead, require the AI to explicitly ask for variant selection when multiple matches exist, and only accept deterministic selection patterns.

### Fix 5: Prompt Engineering for Multi-Variant Handling
**File: `supabase/functions/bob-chat/index.ts`**

Add explicit instruction to system prompt:
```
CRITICAL - MULTIPLE VEHICLE VARIANTS:
When lookup_vehicle returns multiple matches (vehicles array > 1), you MUST:
1. Present a numbered list of variants with key differences (engine, power, year range)
2. Ask the customer to confirm which one is theirs
3. DO NOT assume the first/best match is correct
4. DO NOT say "sorted" or "sweet as" until customer confirms
5. Wait for explicit confirmation before proceeding
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/bob-chat/index.ts` | Force tool call on REGO detection; Fix vehicle ID; Tighten fallback patterns; Prompt engineering |
| `packages/bob-widget/src/components/mobile/MobileBobLayoutCore.tsx` | Remove duplicate Vehicle Context Bar |
| `packages/bob-widget/src/components/mobile/MobileBobLayout.tsx` | Same removal |
| `packages/bob-widget/src/components/mobile/ContainedMobileBobLayout.tsx` | Same removal |

---

## Verification Checklist

After implementation:
- [ ] Send "mkt21 I need brake pads" as first message → Bob should immediately look up vehicle (no asking for REGO)
- [ ] If multiple variants found → Bob presents numbered list and asks to confirm
- [ ] User says "option 2" or "the 3S-GE" → Bob confirms THAT variant specifically
- [ ] Parts AND service packages load correctly for the confirmed vehicle
- [ ] Only ONE vehicle display element (the shelf header) shows the vehicle info
- [ ] No duplicate vehicle bar at the top of the screen
