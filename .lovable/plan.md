# Fresh Session on Page Load (v3.2.20 addition)

## Current Behavior

Bob widget persists the full conversation (messages, vehicle, state) to `sessionStorage` with a 4-hour TTL. On page re-entry, it restores everything — so Bob "remembers" the last vehicle even on a fresh page load.

## Desired Behavior

- Each new page load = clean session (no vehicle, fresh welcome greeting)
- Bob still has access to the customer's garage (via `get_returning_customer_context` tool when email is available)
- Bob still guides through REGO lookup flow as normal
- Session persistence should only survive **within** a single website session (e.g., navigating between pages on the carfix website), not between sessions to the website. i.e. if I close the browser or tab and start a new session, Bob does not start the conversation with my car loaded. 

## The Fix???

### File: `packages/bob-widget/src/hooks/useBobChat.ts`

**Remove or disable the session restore on mount** (lines 238-280). Instead of restoring the previous conversation from `sessionStorage`, always start fresh. The `saveSession` function can remain for mid-session use (e.g., if Bob needs to survive a soft re-render), but the mount-time restore that carries over the vehicle should be removed.

Specifically:

1. **Clear `sessionStorage` on mount** — call `sessionStorage.removeItem(BOB_SESSION_KEY)` at the start of the mount effect, so every fresh page load starts clean
2. Keep the `initialVehicle` prop path intact (lines 274-279) — this is used by session handoff when CARFIX passes a vehicle via `?session=TOKEN`, which is intentional
3. The `saveSession` calls throughout the file can stay — they just won't be restored on next page load

This is a ~5 line change in one file. No CARFIX-side changes needed.

## Files


| File                                          | Change                                                |
| --------------------------------------------- | ----------------------------------------------------- |
| `packages/bob-widget/src/hooks/useBobChat.ts` | Clear sessionStorage on mount instead of restoring it |
