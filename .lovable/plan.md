

# iOS TTS Fix — Web Audio API Approach

## Root Cause

**All browsers on iOS use WebKit** (Apple's requirement). Chrome on iOS = Safari's engine with a Chrome skin. The current fix plays a silent WAV via a throwaway `new Audio()` element, but iOS WebKit does **not** transfer that "unlock" to different `Audio` elements created later after an async `fetch()`. The user gesture call stack is gone by the time the TTS response arrives.

## Solution

Replace `new Audio(url).play()` with a **shared `AudioContext` singleton** that gets `.resume()`'d on the first user gesture and stays unlocked permanently. All TTS audio is then decoded and played as `AudioBufferSourceNode`s through this context.

### Files to change

1. **`packages/bob-widget/src/utils/iosAudioUnlock.ts`** — Rewrite to:
   - Create a singleton `AudioContext` (with `webkitAudioContext` fallback)
   - Export `resumeAudioContext()` — called on first gesture, resumes the context permanently
   - Export `playAudioBuffer(arrayBuffer, onStart, onEnded)` — decodes raw audio bytes and plays through the shared context, returns a stop handle
   - Export `isAudioContextReady()` for diagnostics
   - Keep the `setupIOSAudioUnlock()` entry point but have it call `resumeAudioContext()` instead of playing a silent WAV

2. **`packages/bob-widget/src/hooks/useSpeechSynthesis.ts`** — Modify `processQueue`:
   - Fetch TTS response as `.arrayBuffer()` instead of `.blob()`
   - For pre-recorded clips, fetch the URL as arrayBuffer too
   - Play via `playAudioBuffer()` instead of `new Audio(url).play()`
   - Wire `onStart`/`onEnded` callbacks through the buffer source node
   - Use `source.stop()` for interrupts instead of `audio.pause()`
   - Remove `audioRef` (HTMLAudioElement) and replace with `sourceRef` (AudioBufferSourceNode)

3. **`packages/bob-widget/CHANGELOG.md`** — Document the fix

### Key code approach

```text
┌─────────────────────────────────────────────┐
│  User taps widget (first interaction)       │
│  → setupIOSAudioUnlock calls resume()       │
│  → AudioContext.state becomes "running"     │
│  → Context stays unlocked for page lifetime │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  TTS response arrives (async, no gesture)   │
│  → fetch → .arrayBuffer()                   │
│  → ctx.decodeAudioData(buffer)              │
│  → source = ctx.createBufferSource()        │
│  → source.connect(ctx.destination)          │
│  → source.start(0)  ← works because ctx    │
│    was already unlocked                     │
└─────────────────────────────────────────────┘
```

### CarFix Dev Team Prompt

As part of the plan output, I will include a ready-to-copy prompt for the CarFix development team covering CSP headers, Permissions-Policy, and iframe `allow` attributes they should verify on their end.

## Technical Details

- `AudioContext` is supported on all iOS browsers (Safari, Chrome, Firefox — all WebKit)
- Once resumed during a user gesture, it stays in `"running"` state until the page is closed
- `decodeAudioData` handles MP3 natively on all modern browsers
- The `stop()` method on `AudioBufferSourceNode` is the equivalent of `audio.pause()` for interrupts
- Pre-recorded clip URLs will be fetched as ArrayBuffers via `fetch(url).then(r => r.arrayBuffer())` before decoding

