
# Add Interrupt to the PTT Button

## What "interrupt" means in this context

When Bob is mid-speech (`pttState === 'speaking'`), the user should be able to tap/press the PTT button to **immediately stop all audio and return to idle**, ready to listen for the next input. Right now the button is fully functional during `speaking` state (it is not `disabled`), but pressing it just starts STT listening on top of Bob still talking — it does not stop the audio.

The fix is a single behaviour change: **when `pttState === 'speaking'`, a tap of PTT interrupts Bob's speech first, then starts listening (or just interrupts if the user wants to speak next).**

---

## Current state audit

| Layer | Location | Relevant code |
|---|---|---|
| Speech control | `useSpeechSynthesis.ts` | `stop()` pauses `audioRef`, clears queue, calls `onEnd` |
| Stop wired to Bob | `useBobChat.ts` | `stopAllAudio()` calls `stopSpeech()` (the `stop` fn from synthesis) |
| `isSpeaking` exposed | `Bob.tsx` | `bobChat.isSpeaking` → passed as `isSpeaking` prop down to `MobileChatDrawer` |
| PTT state machine | `MobileChatDrawer.tsx` | `pttState = isSpeaking ? 'speaking' : isLoading ? 'processing' : isListening ? 'listening' : 'idle'` |
| PTT start handler | `MobileChatDrawer.tsx` | `handlePTTStart` — currently **does nothing extra when speaking** |
| Stop callback | `MobileChatDrawer.tsx` | **No `onInterrupt` / `onStopSpeech` prop exists** — the drawer cannot stop Bob |

The gap: `MobileChatDrawer` knows Bob is speaking (`isSpeaking = true`) but has no way to tell `useBobChat` / `useSpeechSynthesis` to stop. It needs an `onInterrupt` callback prop.

---

## The Fix — 3 targeted changes

### Change 1 — Add `onInterrupt` prop to `MobileChatDrawer`

**File:** `packages/bob-widget/src/components/mobile/MobileChatDrawer.tsx`

Add one new optional prop:
```ts
onInterrupt?: () => void;
```

Modify `handlePTTStart` to check `pttState` before doing anything:

```ts
const handlePTTStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
  e.preventDefault();

  // INTERRUPT: If Bob is speaking, stop audio and return to idle
  if (pttState === 'speaking') {
    onInterrupt?.();
    return; // Don't start listening immediately — let user tap again to speak
  }

  if (isLoading || pttActiveRef.current) return;
  pttActiveRef.current = true;
  if (navigator.vibrate) navigator.vibrate(30);
  startListening();
}, [pttState, isLoading, startListening, onInterrupt]);
```

Also update the button label when speaking to make the interrupt affordance obvious:

```tsx
// Current:
{pttState === 'speaking' ? 'PLAYING' : ...}

// New:
{pttState === 'speaking' ? 'TAP TO STOP' : pttState === 'listening' ? 'LISTENING' : pttState === 'processing' ? 'THINKING' : 'TALK'}
```

And remove the `disabled` restriction that only blocks `processing` — the `speaking` state should be tappable (currently it is, but make it explicit):
```ts
disabled={pttState === 'processing'} // no change needed, already correct
```

### Change 2 — Thread `onInterrupt` from `MobileBobLayout` → `MobileChatDrawer`

**File:** `packages/bob-widget/src/components/mobile/MobileBobLayout.tsx`

Add prop to interface and pass down:
```ts
interface MobileBobLayoutProps {
  // ... existing props
  onInterrupt?: () => void;
}
```

Pass through to `MobileChatDrawer`:
```tsx
<MobileChatDrawer
  ...
  onInterrupt={onInterrupt}
/>
```

### Change 3 — Wire `onInterrupt` in `Bob.tsx`

**File:** `packages/bob-widget/src/components/Bob.tsx`

The `bobChat` hook already exposes `stopAllAudio` internally, but it is not returned from `useBobChat`. We need to expose it.

**Sub-change 3a — Expose `stopAllAudio` from `useBobChat`:**

In `packages/bob-widget/src/hooks/useBobChat.ts`, add `stopAllAudio` to the return object:
```ts
return {
  // ... existing returns
  stopAllAudio,
};
```

**Sub-change 3b — Wire in `Bob.tsx`:**

```tsx
// Mobile variant
<MobileBobLayout
  ...
  onInterrupt={bobChat.stopAllAudio}
/>

// Inline/contained variant  
<ContainedMobileBobLayout
  ...
  onInterrupt={bobChat.stopAllAudio}
/>
```

**Sub-change 3c — Thread through `ContainedMobileBobLayout` → `ContainedChatDrawer`:**

Same pattern as `MobileBobLayout`: add `onInterrupt` prop to `ContainedMobileBobLayout` interface and pass it into `ContainedChatDrawer`.

---

## UX behaviour after the fix

| User action | Before | After |
|---|---|---|
| Tap PTT while Bob is idle | Start listening | Start listening (unchanged) |
| Tap PTT while Bob is speaking | Start listening ON TOP of Bob's audio | Immediately stop Bob's audio → return to idle. Next tap starts listening. |
| Tap PTT while Bob is processing/thinking | Blocked (disabled) | Blocked (unchanged) |
| Button label when speaking | "PLAYING" | "TAP TO STOP" |

The "tap once to stop, tap again to speak" two-step feels more intentional and prevents the jarring experience of the mic opening while Bob is still talking.

---

## Files to change

| File | Change |
|---|---|
| `packages/bob-widget/src/hooks/useBobChat.ts` | Add `stopAllAudio` to the return object |
| `packages/bob-widget/src/components/mobile/MobileChatDrawer.tsx` | Add `onInterrupt` prop; modify `handlePTTStart`; update button label |
| `packages/bob-widget/src/components/mobile/MobileBobLayout.tsx` | Add `onInterrupt` prop; pass to `MobileChatDrawer` |
| `packages/bob-widget/src/components/mobile/ContainedMobileBobLayout.tsx` | Add `onInterrupt` prop; pass to `ContainedChatDrawer` |
| `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx` | Add `onInterrupt` prop; same `handlePTTStart` logic + label change |
| `packages/bob-widget/src/components/Bob.tsx` | Pass `bobChat.stopAllAudio` as `onInterrupt` to both layout variants |

## What this does NOT change
- The `processing` / thinking state remains fully blocked — user cannot interrupt while Bob is fetching from the API mid-stream.
- No changes to `useSpeechSynthesis` — `stop()` already cleanly handles everything including clearing the queue and firing `onEnd` to reset animation state.
- No changes to the edge function or any backend code.
- No changes to the test suite required (the existing PTT tests cover the hook logic; the interrupt behaviour is a UI-layer concern in the drawer).
