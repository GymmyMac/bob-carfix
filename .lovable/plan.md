

# Bug Fix Plan: CARFIX × Bob Widget — 3 Critical Bugs

## Investigation Findings

After thorough code review, here are the root causes for each bug:

---

### Bug #1 — Quick-Reply Buttons Insert Text Into Chat

**Status: Cannot reproduce in current codebase.** The `MobileChatDrawer` and `ContainedChatDrawer` both handle quick-reply buttons correctly — they call `onQuickReply?.(qr.url)` with `e.stopPropagation()` and do NOT insert text into the input. No code path exists that sets the input value from a quick-reply tap.

**However**, two improvements should be made:
- Quick-reply taps should call `onInterrupt()` (stop speech) before navigating, matching the `navigate_url` SSE event behavior.
- The `ContainedChatDrawer` should be checked for missing speech-stop on button tap.

**Plan:** Add `onInterrupt?.()` call before `onQuickReply` in both chat drawer components.

---

### Bug #2 — No Imperative Stop-Speech Handle

**Root cause found.** `BobStandalone` already implements `forwardRef` + `useImperativeHandle` with `stopSpeech()` and `interrupt()` methods. **But** the `onStopSpeechReady` callback (line 369 of `useBobChat.ts`) only captures `stopSpeech` from `useSpeechSynthesis` — this only stops TTS audio. It does **not** capture `stopAllAudio`, which also stops canned audio clips and searching audio played via `audioControllerRef`.

**Plan:** Change `onStopSpeechReady` to pass `stopAllAudio` instead of `stopSpeech`, so the imperative handle silences all audio sources (TTS + canned + searching).

**Files:**
- `packages/bob-widget/src/hooks/useBobChat.ts` — line 369: change `stopSpeech` → `stopAllAudio`

---

### Bug #3 — PTT Does Not Interrupt Mid-Speech

**Root cause found.** The `isSpeaking` state exposed by `useBobChat` comes from `useSpeechSynthesis` only. When Bob plays **canned audio** (pre-recorded clips via `playControlledAudio`), `isSpeaking` remains `false` because the audio controller is separate from the TTS hook. This means `pttState` resolves to `idle` instead of `speaking`, so the PTT interrupt path (`if (pttState === 'speaking') onInterrupt()`) never fires during canned audio playback.

**Plan:** Introduce a composite `isSpeaking` that is `true` when EITHER TTS is speaking OR the audio controller is playing. Expose this composite value from `useBobChat` instead of the TTS-only value.

**Files:**
- `packages/bob-widget/src/hooks/useBobChat.ts`:
  - Add `isAnyAudioPlaying` state that tracks `audioControllerRef.current.isPlaying || isSpeaking`
  - Update `playControlledAudio` onplay/onended/onerror to toggle this state
  - Return composite `isSpeaking: isAnyAudioPlaying` from the hook

---

## Implementation Summary

| File | Changes |
|---|---|
| `useBobChat.ts` | 1. Pass `stopAllAudio` to `onStopSpeechReady` (Bug #2). 2. Add `isAnyAudioPlaying` state that combines TTS + canned audio states (Bug #3). |
| `ContainedChatDrawer.tsx` | Add `onInterrupt?.()` before `onQuickReply` call (Bug #1). |
| `MobileChatDrawer.tsx` | Add `onInterrupt?.()` before `onQuickReply` call (Bug #1). |
| `version.ts` + `package.json` | Bump to v3.2.5. |
| `CHANGELOG.md` | Document all three fixes. |

**Estimated scope:** ~30 lines changed across 5 files.

