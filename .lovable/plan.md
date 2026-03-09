

# Implement Follow-Up Bypass in bob-chat Edge Function (v3.2.11)

## What Was Left Unfinished

The latency analysis from the previous session identified that follow-up requests (user asks for parts after vehicle is already confirmed) take 25-35s because `canBypassToolLoop` only triggers on same-request REGO lookups (`isDeterministic`). The fix was proposed but never applied to the edge function.

## The Fix

**File: `supabase/functions/bob-chat/index.ts`** (~line 2867)

Extend the bypass condition to include follow-up requests where vehicle context already exists:

```typescript
// Follow-up bypass: vehicle confirmed in previous turn, 
// client already has parts/packages — no need for tool loop
const isFollowUpWithVehicle = !!effectiveVehicleContext && !isDeterministic;

const canBypassToolLoop = (
  (isDeterministic && (hasPartsLoaded || hasPackagesLoaded)) ||
  (isFollowUpWithVehicle && !hasSymptomGlobal && !hasCartIntent)
) && !hasSymptomGlobal && !hasCartIntent;
```

The follow-up bypass skips the tool loop and goes straight to the streaming call. The AI still gets full conversation history + vehicle context in the system prompt, so it can discuss the specific part. The client-side shelf scroll logic (v3.2.10) handles navigating to the relevant category.

**Key safety guards (already in place):**
- Symptom detection → forces `diagnose_symptom` tool call (not bypassed)
- Cart/checkout intent → needs tool handling (not bypassed)
- The bypass path already handles brand context injection (lines 3371-3383)

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/bob-chat/index.ts` | Extend `canBypassToolLoop` to include follow-up requests with confirmed vehicle |
| `packages/bob-widget/src/version.ts` | Bump to 3.2.11 |
| `packages/bob-widget/package.json` | Bump to 3.2.11 |
| `packages/bob-widget/CHANGELOG.md` | Document latency fix |

## Expected Impact
Follow-up part requests: **~25-35s → ~5-8s** (eliminates 2 redundant LLM round-trips).

