# Session Persistence — Tab-Scoped (v3.2.20)

## Behaviour

- Customer navigates around CARFIX site → Bob **keeps** vehicle & conversation (sessionStorage persists within the same tab)
- Customer closes the tab/browser and comes back → Bob starts **fresh** (sessionStorage auto-clears)
- 4-hour TTL guards against stale sessions in long-lived tabs
- `initialVehicle` prop (session handoff via `?session=TOKEN`) always takes priority

## Implementation

`sessionStorage` is natively tab-scoped — no custom clear logic needed. The mount effect in `useBobChat.ts` restores messages, vehicle, candidates, and conversation state from `sessionStorage` if the session is within the 4-hour TTL.

## Files

| File | Change |
|------|--------|
| `packages/bob-widget/src/hooks/useBobChat.ts` | Restore session from sessionStorage on mount with 4h TTL |
