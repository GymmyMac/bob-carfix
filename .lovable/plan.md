

# Chat Bar White Background Fix + Idle Green Ring + Processing Text Update

## Problem

Three issues to address:

1. **Chat bar defaults to dark blue** -- The `widget-reset.css` has aggressive `!important` overrides on `input[type="text"]` forcing `background: rgba(0, 51, 102, 0.85) !important` and `color: white !important`. These override the inline white background styles set in the drawers.

2. **Idle PTT ring should be green** -- When the PTT button is prompting for use (idle state), the ring should pulse green (fading light/dark) to indicate "action required", not blue.

3. **Processing text says "Bob is thinking..."** -- Should read "Bob is researching your input."

## Changes

### File 1: `packages/bob-widget/src/styles/widget-reset.css`

- **Update the global `input[type="text"]` override** (line 305) to use white background and navy text instead of dark blue. This ensures the chat bar is always white regardless of host site interference.
- **Update the `.high-contrast-input::placeholder`** colour from white/semi-transparent to navy/semi-transparent to match the white background.

Before:
```css
background: rgba(0, 51, 102, 0.85) !important;
color: white !important;
border: 2px solid rgba(255, 255, 255, 0.35) !important;
```

After:
```css
background: #FFFFFF !important;
color: #0F172A !important;
border: 2px solid rgba(15, 23, 42, 0.15) !important;
```

### File 2: `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx`

- **Update idle ring config** (line 144): Change from blue (`rgba(0, 102, 204, 0.5)`) to green (`rgba(34, 197, 94, 0.5)`) and use the `ring-speaking` animation (which already has green glow) or a dedicated green breathing animation.
- **Update processing text** (line 369): Change "Bob is thinking..." to "Bob is researching your input."

### File 3: `packages/bob-widget/src/components/mobile/MobileChatDrawer.tsx`

- **Same idle ring colour change** to green.
- **Same processing text update** (line 456): "Bob is thinking..." to "Bob is researching your input."

### File 4: `packages/bob-widget/src/__tests__/pttLongPress.test.ts`

- Update any test assertions that reference "Bob is thinking" to match the new text.

## Technical Notes

- The `!important` overrides in `widget-reset.css` are necessary for host-site isolation (they prevent CARFIX's own styles from bleeding in). Changing them to white/navy is safe because both chat drawers already set white inline styles -- the CSS just needs to agree.
- The idle green ring reuses the existing `ring-breathe` keyframe animation but changes the border colour from blue to green. The effect is a gentle green fading pulse that says "press me".
- The `high-contrast-input` class placeholder colours will flip from white-on-dark to navy-on-white for consistency.
