# Understanding Bob's Pre-Vehicle State & Loading Spinner Issue

## How It Works Today

The widget has a **3-state visual system** controlled by `MobileBobLayoutCore`:

1. `**panelState**` — `hidden` | `loading` | `transitioning` | `visible`
2. `**bobPosition**` — `center` | `partial-left` | `hidden`
3. `**isResearching**` — boolean, set by `Bob.tsx` callbacks

### The Flow

```text
Page loads → Bob appears center → User types REGO
→ streamChat fires → onResearchStart sets isResearching=true
→ MobileBobLayoutCore sees isResearching, moves Bob partial-left
→ MobileProductColumn shows with "Searching shelves..." spinner
→ Backend sends parts_found/service_packages_found SSE events
→ Products populate → isResearching=false → Shelf shows products
```

### The Problem

The `isResearching` flag is set to `true` when the user sends a message (via `onResearchStart` callback in `Bob.tsx` line 218). This triggers the product column to become visible with a loading spinner. But **before any vehicle is identified**, there's nothing meaningful to show — just an empty shelf with a spinner that says "Searching shelves..." while Bob is just doing conversational REGO lookup.

The spinner persists because:

- `isResearching` is set true on **every** message send (not just parts searches)
- If the vehicle lookup takes multiple turns (e.g., variant selection), the spinner stays visible throughout
- The `panelState` transitions to `loading` and never goes back to `hidden` unless `hasContent` changes AND `isResearching` becomes false simultaneously

Additionally, **before the customer has even typed anything**, the store is just Bob standing in front of his CARFIX shop backdrop — which is fine as we are already in CARFIX.co.nz.

## Pre-Vehicle State (What the user sees before typing)

Currently: Bob centered, no shelf, no products. This is actually clean. The issue is when the user **starts chatting** and `isResearching` fires prematurely, showing a spinner with no products incoming.

## Proposed Solution

### Option A: Only show loading shelf when vehicle is confirmed

- Don't set `isResearching=true` until a `vehicle_identified` or `parts_found` SSE event actually arrives
- This means the shelf stays hidden during conversational REGO lookup / variant selection
- Simplest fix, removes the premature spinner

### Option B: Auto-load last vehicle from garage

- On mount, check if `customerEmail` is available via session handoff
- Call `get_returning_customer_context` to fetch garage vehicles
- Auto-load the most recently used vehicle and fetch its parts catalog
- User sees products immediately without needing to type their REGO
- More complex but provides a richer initial experience

### Option C: Both (recommended)

- Fix the premature spinner (Option A) — always needed
- Add auto-load from garage as an enhancement — only works when customer email is available

## Implementation Plan

### Step 1: Fix premature loading spinner

`**packages/bob-widget/src/components/Bob.tsx**`

- Change `onResearchStart` to NOT set `isResearching=true` unconditionally
- Instead, only set it when we know parts are actually being fetched (i.e., vehicle is already identified OR a `parts_found` event is incoming)
- Add a new SSE event handler: when `type === "researching_parts"` arrives from backend, THEN set `isResearching=true`

`**packages/bob-widget/src/hooks/useBobChat.ts**`

- Add a `onPartsResearchStart` callback that fires only when the backend actually starts a parts lookup (detectable via tool_call events or a new SSE event type)
- Keep `onResearchStart` for animation state changes (thinking state) but decouple it from product shelf visibility

### Step 2: Clean pre-vehicle store appearance

- Ensure `MobileProductColumn` is fully hidden (not just invisible) when there's no vehicle and no products
- Remove the "Searching shelves..." text when no vehicle context exists

### Step 3 (Enhancement): Auto-load garage vehicle

- In `useBobChat`, after session restore, if `customerEmail` exists but no `identifiedVehicle`:
  - Send a lightweight request to bob-chat with a `autoLoadGarage: true` flag
  - Backend fetches garage via `get_returning_customer_context` and returns the most recent vehicle
  - Widget auto-confirms that vehicle and fetches its parts catalog
- This gives returning customers an immediate product shelf on load

### Files to modify

1. `packages/bob-widget/src/components/Bob.tsx` — Decouple `isResearching` from general message sends
2. `packages/bob-widget/src/hooks/useBobChat.ts` — Add `onPartsResearchStart` callback, auto-garage logic
3. `packages/bob-widget/src/components/mobile/MobileBobLayoutCore.tsx` — Only show product column when there's actual content or confirmed research
4. `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx` — Clean up loading state text
5. `supabase/functions/bob-chat/index.ts` — Emit `researching_parts` SSE event before tool execution, handle `autoLoadGarage` flag
6. `packages/bob-widget/CHANGELOG.md` — Document changes