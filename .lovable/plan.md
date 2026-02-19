
# Fix: Add `match_count` to Brain API Request

## The Bug

In `supabase/functions/bob-chat/index.ts` at line 1719, the request body sent to `query-brain` is missing the required `match_count` field specified in the CARFIX Brain API spec:

**Current (broken):**
```json
body: JSON.stringify({ query: userQuery })
```

**Required per spec:**
```json
body: JSON.stringify({ query: userQuery, match_count: 3 })
```

The CARFIX Brain SQL function `match_brain_observations_optimized` receives `match_count` as a parameter. When it arrives as null/undefined, Postgres cannot resolve the function call, returning `500 {"error":"Diagnosis lookup failed"}`. This is why the endpoint kept failing even after CARFIX fixed the column alias bug.

## The Evidence Trail

From the edge function logs (in chronological order):

1. Earlier test: Brain returned `200 {"success":true,"diagnosis_trace":[],"no_match":true}` — this was a run where the SQL bug was partially fixed but no bulletins were seeded yet, OR the similarity score was below 0.70.
2. Most recent test (after CARFIX confirmed the migration): `500 {"error":"Diagnosis lookup failed"}` — the column alias is fixed but the missing `match_count` is now the active failure cause.

The screenshot confirms Bob's fallback path fires correctly ("the CARFIX Brain doesn't have a specific bulletin") — so all the no_match handling is working. The Brain just never returns a valid result because the request is malformed.

## File to Change

Only `supabase/functions/bob-chat/index.ts` — one line change.

## The Fix

**Line 1719** — add `match_count: 3` to the request body:

```typescript
// BEFORE
body: JSON.stringify({ query: userQuery }),

// AFTER
body: JSON.stringify({ query: userQuery, match_count: 3 }),
```

## What happens after the fix

```text
User: "I can see blue smoke coming out of the exhaust pipe"
  → diagnose_symptom forced
  → query-brain called with { query: "...", match_count: 3 }  ← FIXED
  → Brain SQL function receives valid parameters
  → Returns diagnosis_trace with partslot_description: "ENGINE OIL"
  → retrieve-parts called for category "ENGINE OIL", vehicle 27314
  → parts_found SSE emitted → shelf populated
  → highlight_category SSE emitted → shelf scrolls to ENGINE OIL
  → Bob explains oil-burning physics (physics_title + physics_logic)
```

## Files to Change

| File | Change |
|---|---|
| `supabase/functions/bob-chat/index.ts` | Line 1719: add `match_count: 3` to the Brain API request body |

The edge function will be redeployed automatically after the change.
