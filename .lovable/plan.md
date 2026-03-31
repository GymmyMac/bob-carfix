

# Revert: Restore Session Persistence Within Browser Session

## The Misunderstanding

The previous change cleared `sessionStorage` on every page mount — meaning Bob forgets the vehicle even when the customer just navigates from "Parts" to "Ask Bob" on the CARFIX site. That's wrong.

## What You Actually Want

- Customer navigates around CARFIX site → Bob **keeps** the vehicle and conversation
- Customer closes the tab/browser and comes back → Bob starts **fresh**

## Why `sessionStorage` Already Does This

`sessionStorage` is natively scoped to a browser tab. It **automatically clears** when the tab or browser is closed. It persists across same-tab navigations (e.g., clicking between pages on CARFIX). This is exactly the behavior you want — we just need to stop clearing it on mount.

## The Fix

**Revert the mount effect** in `packages/bob-widget/src/hooks/useBobChat.ts` (lines 237-258) to **restore** the session from `sessionStorage` instead of clearing it. The original restore logic (messages, vehicle, conversation state) should be put back. The 4-hour TTL can stay as a safety net for stale sessions.

### File: `packages/bob-widget/src/hooks/useBobChat.ts`

Replace the current "clear on mount" block with session restore:
1. Read from `sessionStorage` using `BOB_SESSION_KEY`
2. Check TTL — if expired, discard and start fresh
3. If valid, restore messages, identified vehicle, conversation state
4. Keep the `initialVehicle` prop override (session handoff takes priority)

### File: `.lovable/plan.md`

Update to reflect the corrected understanding.

| File | Change |
|------|--------|
| `packages/bob-widget/src/hooks/useBobChat.ts` | Restore session from sessionStorage on mount (revert the clear) |
| `.lovable/plan.md` | Update plan to reflect correct session behavior |

