

# Fix: Host CSS Overriding Widget Styles on CARFIX

## Problem

The CARFIX host site has high-specificity CSS rules (likely with `!important`) targeting generic `button`, `input`, and `div` elements. This overrides the widget's inline styles for:

- PTT button green gradient (shows blue/default instead)
- Chat bar white background (shows host-styled input instead)
- State overlay backgrounds (listening/processing/speaking feedback)
- Ring animation keyframes (still coded as blue in CSS)

The auto-scroll feature works fine -- it's pure JS, no CSS involvement.

## Root Causes

1. **CSS Specificity**: Host rules like `button { background-color: #xyz !important }` beat inline styles
2. **Stale Keyframes**: `ptt-pulse` and `ring-breathe` in `widget-reset.css` still reference blue `rgba(0, 102, 204, ...)` instead of green `rgba(34, 197, 94, ...)`
3. **No scoped override**: The widget reset doesn't include `!important` rules for PTT or chat bar elements

## Solution: CSS Custom Properties + Scoped !important Rules

### Strategy

React inline styles cannot use `!important`. The fix uses **CSS custom properties** (set via inline `style`) consumed by **scoped CSS rules with `!important`**. This guarantees the widget styles win regardless of host specificity.

### File 1: `packages/bob-widget/src/styles/widget-reset.css`

**A. Fix keyframes** -- change blue to green:

```css
/* ptt-pulse: change rgba(0, 102, 204, ...) to rgba(34, 197, 94, ...) */
@keyframes ptt-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
  50% { box-shadow: 0 0 0 16px rgba(34, 197, 94, 0); }
}

/* ring-breathe: change rgba(0, 102, 204, ...) to rgba(34, 197, 94, ...) */
@keyframes ring-breathe {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.15);
    box-shadow: 0 0 20px 4px rgba(34, 197, 94, 0.2);
  }
}
```

**B. Add scoped override rules** for PTT button, chat bar input, and state overlay:

```css
/* PTT button: consume CSS vars with !important to beat host */
.bob-widget-root .bob-ptt-btn {
  background: var(--bob-ptt-bg) !important;
  box-shadow: var(--bob-ptt-shadow) !important;
  border: var(--bob-ptt-border) !important;
  border-radius: var(--bob-ptt-radius) !important;
}

/* Chat bar input: force white background */
.bob-widget-root .bob-chat-input {
  background: #FFFFFF !important;
  color: #0F172A !important;
  border: 2px solid rgba(15, 23, 42, 0.15) !important;
  border-radius: 20px !important;
}

/* State overlay: force white background */
.bob-widget-root .bob-state-overlay {
  background: #FFFFFF !important;
  border: 2px solid rgba(15, 23, 42, 0.15) !important;
  border-radius: 20px !important;
}
```

### File 2: `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx`

- Add `className="glass-button bob-ptt-btn"` to PTT button (line ~449)
- Set CSS custom properties on the button's `style` prop:
  ```tsx
  style={{
    ...otherStyles,
    '--bob-ptt-bg': currentPttStyle.background,
    '--bob-ptt-shadow': currentPttStyle.boxShadow,
    '--bob-ptt-border': currentPttStyle.border,
    '--bob-ptt-radius': '50%',
  } as React.CSSProperties}
  ```
- Add `className="bob-chat-input high-contrast-input"` to the text input
- Add `className="bob-state-overlay"` to the state overlay div

### File 3: `packages/bob-widget/src/components/mobile/MobileChatDrawer.tsx`

Same pattern as File 2:
- Add `className="glass-button bob-ptt-btn"` to the TALK button (line ~324)
- Set CSS custom properties for background/shadow/border/radius (`--bob-ptt-radius: 32px` for this variant)
- Add `className="bob-chat-input high-contrast-input"` to the text input
- Add `className="bob-state-overlay"` to the state overlay div

## How It Works

```text
React Component                    widget-reset.css
+---------------------------+      +--------------------------------+
| style={{                  |      | .bob-widget-root .bob-ptt-btn { |
|   '--bob-ptt-bg': green,  | ---> |   background: var(--bob-ptt-bg) |
|   '--bob-ptt-shadow': ... |      |     !important;                 |
| }}                        |      | }                               |
| className="bob-ptt-btn"   |      +--------------------------------+
+---------------------------+
                                   Host CSS can't override because:
                                   1. Scoped selector (.bob-widget-root .bob-ptt-btn)
                                   2. !important on the widget rule
                                   3. CSS var value set inline = dynamic per state
```

## Version

This is a CSS engineering fix with no logic changes. Can ship as part of v3.2.1 (patch the build) or bump to v3.2.2.

## Files Changed

| File | Change |
|------|--------|
| `widget-reset.css` | Fix keyframes to green; add scoped `!important` rules for PTT, chat input, state overlay |
| `ContainedChatDrawer.tsx` | Add CSS class names + custom properties to PTT button, input, overlay |
| `MobileChatDrawer.tsx` | Same as above |

## Safety

- No logic changes -- only CSS specificity engineering
- All 52+ unit tests unaffected (they don't test CSS specificity)
- Inline styles still control the dynamic values (state colours change correctly)
- Only the delivery mechanism changes: CSS vars + `!important` instead of raw inline styles

