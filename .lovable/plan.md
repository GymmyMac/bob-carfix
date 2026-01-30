
Goal
- After a multi-variant rego lookup, Bob should verbally verify the correct variant with the user, then reliably load BOTH:
  - full parts catalog (partslot parts on shelf)
  - service bundles (preparedTiers service packs on shelf)
- No vehicle “cards” UI required for variant selection.
- Fix the “Bob behind shelf” layering regression and make layering deterministic.

What’s actually broken (root cause)
1) The backend currently has no durable memory of “vehicle candidates” across messages
- In a multi-variant flow, the candidate list is produced during Request #1 (lookup_vehicle tool call).
- The user confirms the variant in Request #2.
- But the edge function currently stores `_multipleVehicleCandidates` only in the in-memory `conversationMessages` array for that single request. It is NOT persisted anywhere and is NOT sent back to the client in a structured way the client can return later.
- Result: on Request #2, the backend does not know which candidates existed, so it cannot turn the user’s “yeah the 2.0L one / 150 kW / option 2” into a numeric TecDoc `vehicle_id`, and no parts/packages fetch is triggered → stream emits `no_parts_found`.

2) The stream always emits `no_parts_found` when `partsToEmit` is empty
- This happens even in “waiting for variant confirmation” states, which causes the UI to clear shelves and makes debugging harder.
- A multi-variant request should not clear shelves; it should emit “awaiting selection” state.

3) Z-layer: stacking context causes shelf to overlay Bob unexpectedly
- Changing z-index on the column alone can be ineffective if parent stacking contexts differ (overflow/transform/isolation).
- We need a single, deterministic stacking context for the whole Bob scene and then set z-index relative to that.

High-level corrected workflow (loops/forks + required calls)
```text
User message → bob-chat request

A) If vehicle already confirmed (vehicleContext exists):
   → retrieveParts(vehicleId)   (unless already loaded)
   → calculate-service-bundles(vehicleId) (unless already loaded)
   → stream: emit vehicle_identified + service_packages_found + parts_found

B) If no vehicle confirmed:
   → AI tool loop may call lookup_vehicle
      B1) Single match:
          → confirm immediately (store confirmed vehicle)
          → retrieveParts(vehicleId)
          → calculate-service-bundles(vehicleId)
          → stream emits all events
      B2) Multiple matches:
          → emit vehicle_candidates_found (structured candidates list) + multiple_vehicles_found
          → DO NOT emit no_parts_found
          → AI asks user to confirm variant (verbal)
          → client stores candidates for next request

C) Next user message (variant choice) + candidates returned by client:
   → deterministic variant matcher (server-side, no AI marker reliance)
   → pick candidate → set confirmed vehicle
   → retrieveParts(vehicleId)
   → calculate-service-bundles(vehicleId)
   → stream emits all events
```

Implementation plan (what will change)

1) Backend: persist candidates across requests (without adding vehicle cards)
1.1 Emit candidates to the client via SSE
- In `supabase/functions/bob-chat/index.ts`, when multiple variants are detected:
  - Keep `_multipleVehiclesFound = true`
  - Also store a minimized candidate list in `_vehicleCandidatesToEmit` (only essential fields)
  - Emit a new SSE event early in stream start:
    - `{ type: "vehicle_candidates_found", candidates: [...] }`
  - Candidate payload should be small and stable:
    - `vehicle_id` (numeric TecDoc ID)
    - `vehicle_name_nz` (primary display string)
    - `make`, `model`, `start_year`, `end_year`
    - `engine_code`, `cc_rating`, `fuel_type`, `score` (if present)

1.2 Frontend: store candidates (in memory only) and send them back on next message
- In `packages/bob-widget/src/hooks/useBobChat.ts`:
  - Add handling for `vehicle_candidates_found` SSE event
  - Store candidates in a `useRef` (e.g., `vehicleCandidatesRef.current = candidates`)
  - When calling `bob-chat`, include `vehicleCandidates: vehicleCandidatesRef.current` in request body
  - When a vehicle gets confirmed (`vehicle_identified` event), clear the ref

No UI changes required; this is invisible unless we optionally later add quick-reply chips.

2) Backend: deterministic “variant confirmation” selection on Request #2 (no AI marker reliance)
2.1 Add request-body support
- Update bob-chat request parsing to accept `vehicleCandidates` (optional array)

2.2 Before calling the AI gateway, attempt deterministic selection if:
- There is no `vehicleContext`
- `vehicleCandidates` exists and non-empty
- The latest user message likely contains a selection

2.3 Variant selection heuristics (server-side)
Match user input against candidates by priority:
- Option number:
  - If candidates were presented as “1)… 2)…”, detect `^(\d+)$` and map to index
- Direct vehicle_id:
  - If user types a 4-6 digit number matching a candidate `vehicle_id`
- Engine code match:
  - `3S-GE`, `1G-FE`, etc
- Displacement/cc rating:
  - detect “2.0”, “2000”, “1998cc”, “1990” and compare
- Fuel type:
  - petrol/diesel
- Substring match against `vehicle_name_nz`

If match confidence is low:
- Do not fetch parts/packages yet
- Have Bob ask a tighter question (e.g. “Is it the 3S-GE 4cyl or 1G-FE 6cyl?”)

2.4 Once a candidate is selected:
- Set `_confirmedVehicle` to the matched candidate (normalize fields)
- Set `_lookupVehicleId` to candidate.vehicle_id
- Clear `_multipleVehiclesFound` (to stop placeholder behavior now that we have a selection)
- Fetch:
  - `retrieveParts(vehicle_id)`
  - `fetchPreparedServiceBundles(vehicle_id)` (calculate-service-bundles)
- Store results into `_partsToEmit` / `_servicePackagesToEmit`
- Stream will then emit `vehicle_identified`, `service_packages_found`, `parts_found` immediately, independent of whether the AI emits `[VEHICLE_CONFIRMED]`

This ensures the shelf populates even if the AI forgets the marker.

3) Backend: stop emitting `no_parts_found` during “awaiting variant selection”
- In the streaming transform:
  - If `_multipleVehiclesFound` is true AND there is no confirmed vehicle AND no parts loaded:
    - Emit:
      - `multiple_vehicles_found`
      - `vehicle_candidates_found`
    - Do NOT emit `no_parts_found`
  - Only emit `no_parts_found` if:
    - we attempted a parts fetch for a confirmed vehicle and got 0
    - OR we are in autoFetchParts mode and got 0

This prevents the frontend from clearing shelves in the middle of the variant-selection step.

4) Backend: increase observability (so we stop guessing)
Add structured logs (info-level) around the critical branches:
- Multiple-match detection: count + top 3 candidate labels + ids
- Candidate event emission: count
- Deterministic selection attempt on next request:
  - user message excerpt
  - selection method: `index|engine_code|cc|substring|vehicle_id`
  - selected `vehicle_id` + `vehicle_name_nz`
- Fetch results:
  - parts count + response status if failure
  - packages count + (if available) first package hasPreparedTiers + tiersCount
- Stream emission summary:
  - emittedVehicle: yes/no
  - emittedPackages: count
  - emittedParts: count
  - emittedNoPartsFound: yes/no (and why)

5) Service packs parity: ensure we only emit displayable preparedTiers bundles
- Confirm `fetchPreparedServiceBundles()` returns `packages` in a consistent shape.
- Ensure we store/emit only packages with `preparedTiers`:
  - If the bundles endpoint returns `{ data: { servicePackages: [...] } }`, ensure extraction is correct.
  - If `preparedTiers` is missing, log and emit an empty packages array (but still emit parts).

6) Z-layer fix (deterministic stacking context)
The fix will be done in the widget layout, not by guessing z-index numbers:
- Ensure the root scene container uses `isolation: isolate` (or equivalent) so all children share a predictable stacking context.
- Ensure:
  - Background layer is at the bottom
  - Product shelf sits behind Bob’s character but remains interactive (pointer events preserved)
  - Counter overlay sits above Bob (covering lower body)
  - Chat drawer sits above everything

Concrete changes likely needed:
- `packages/bob-widget/src/components/mobile/MobileBobLayoutCore.tsx` and/or `ContainedMobileBobLayout.tsx`
  - Add `isolation: isolate` on the main container
  - Confirm no parent introduces `transform`/`filter` that creates unexpected stacking contexts
- `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`
  - Set z-index relative to the unified context (and verify pointer events)
- `packages/bob-widget/src/components/mobile/MobileBobCharacter.tsx`
  - Ensure its z-index is above product shelf within the same stacking context

7) Verification steps (end-to-end)
Run these tests on /ask-bob:
A) Multi-variant rego (e.g. “MKT21”)
1. Enter rego
2. Expect Bob to ask which variant
3. Confirm with:
   - “option 2”
   - “the 3S-GE”
   - “the 2.0L petrol”
4. Expected:
   - Shelf loads service packs + parts catalog
   - No `no_parts_found` emitted during the “pick a variant” step
B) Single-variant rego
1. Enter rego that returns a single match
2. Expected:
   - immediate packages + parts
C) Regression checks
- Confirm Bob is visually in front of the shelf (head not covered)
- Confirm counter overlay still covers Bob’s lower body correctly
- Confirm chat still clickable and shelf scroll still works

Scope notes / non-goals
- No vehicle cards UI
- Optional later: add quick-reply “chips” for candidate options; not required for correctness

If you want me to continue in a new request after this plan is approved, I’ll implement:
- new SSE event + client storage + deterministic selection
- corrected no_parts_found emission logic
- z-layer stacking context fix
- add logs to quickly validate counts and branches
