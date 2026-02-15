

# Enhanced PTT Experience: Ring Animations + Chat Bar Feedback

## Core Insight

The user's finger covers the PTT button face during use, making any icon animations or labels invisible. The solution splits feedback across two surfaces:

1. **PTT button circumference** -- animated rings that extend beyond the finger's touch area
2. **Chat input bar** -- repurposed as a status display with waveform visualizer when Bob speaks

## Chat Bar Redesign

The chat input bar switches to **white background with CARFIX Deep Navy text** (`#0F172A`). This creates a high-contrast, clean surface that doubles as a feedback display during non-typing states.

## Four States

```text
+---------------------+-----------------------------+-------------------------------+
| State               | PTT Ring (around button)    | Chat Bar                      |
+---------------------+-----------------------------+-------------------------------+
| Idle                | Blue breathing pulse ring   | White bar, navy placeholder   |
|                     | (existing, slightly larger) | "Message Bob..."              |
+---------------------+-----------------------------+-------------------------------+
| Listening (PTT held)| Orange expanding rings      | White bar shows pulsing       |
|                     | (existing waves, enhanced)  | orange dot + "Listening..."   |
+---------------------+-----------------------------+-------------------------------+
| Processing          | Grey contracting ring       | White bar shows spinning      |
|                     | (slow inward pulse)         | dots + "Bob is thinking..."   |
+---------------------+-----------------------------+-------------------------------+
| Bob Speaking        | Green soft glow ring        | White bar replaced by         |
|                     | (steady outward pulse)      | 5-bar waveform visualizer     |
|                     |                             | + "Bob is talking..."         |
|                     |                             | If muted: red X icon shown    |
+---------------------+-----------------------------+-------------------------------+
```

## Implementation Details

### File 1: `packages/bob-widget/src/styles/widget-reset.css`

Add new CSS keyframes:

- `@keyframes ring-breathe` -- scale 1.0 to 1.2 on a 72px ring, 2s cycle (idle)
- `@keyframes ring-processing` -- scale 1.1 to 0.95, 1.5s cycle (processing)
- `@keyframes ring-speaking` -- scale 1.0 to 1.15 with green glow, 1.8s cycle
- `@keyframes waveform-bar-1` through `waveform-bar-5` -- staggered height oscillation (4px to 20px) for the speaking visualizer in the chat bar
- `@keyframes dot-pulse` -- opacity 0.3 to 1.0 for the listening indicator dot in chat bar

### File 2: `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx`

Changes to the input area (lines 240-448):

1. **Chat input bar** -- change background to white (`#FFFFFF`), text color to Deep Navy (`#0F172A`), border to `rgba(15, 23, 42, 0.15)`, placeholder color to `rgba(15, 23, 42, 0.5)`
2. **State overlay on chat bar** -- when `isListening`, `isLoading`, or `isSpeaking`, overlay the input with a status display:
   - Listening: orange pulsing dot + "Listening..." in navy text on white
   - Processing: animated dots + "Bob is thinking..." in navy text on white
   - Speaking: 5 vertical bars animating heights (CSS-only staggered sine) + "Bob is talking..." -- if `isMuted`, show a red muted-speaker icon as a warning
3. **PTT ring animations** -- the existing ring divs around the PTT button are updated:
   - Idle: keep blue pulse but use `ring-breathe` keyframe (slightly larger radius)
   - Listening: keep orange waves (existing `ptt-wave`), no change needed
   - Processing: swap to grey ring with `ring-processing` (contracting pulse)
   - Speaking: green ring with `ring-speaking` (gentle glow expansion)

### File 3: `packages/bob-widget/src/components/mobile/MobileChatDrawer.tsx`

Same state-driven changes applied to:

1. The text input bar (lines 340-364): white background, navy text
2. A new status overlay component that replaces the input visually during active states
3. The TALK button area: add ring divs for processing and speaking states (currently only has idle/listening rings)

### File 4: `packages/bob-widget/src/__tests__/pttLongPress.test.ts`

Extend with tests for:

- State derivation logic: `isSpeaking > isLoading > isListening > idle` priority
- Chat bar style constants: white background and navy text values
- Waveform bar count (5 bars for speaking state)

## Technical Notes

- All animations are CSS `@keyframes` only -- no JS animation loops or Web Audio API
- The waveform bars are decorative (CSS timing offsets), not driven by real audio analysis
- The chat input remains fully functional -- the status overlay only appears when the user is NOT typing (i.e., during PTT hold, processing, or Bob speaking). If the user taps the input field, the overlay dismisses immediately
- The muted warning (red speaker-X icon) only shows during the "speaking" state when `isMuted=true`, prompting the user to unmute or turn volume up
- Ring animations use `pointer-events: none` so they never interfere with touch targets
- The white chat bar uses the widget-reset CSS override to ensure host styles don't bleed in

