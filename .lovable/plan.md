

## Fix: Desktop scroll arrows not scrolling product rows

### Root cause analysis

After tracing the full DOM/CSS chain, there are **two likely causes** working together:

1. **`snap-x snap-mandatory` fighting `scrollBy`**: The product row has Tailwind's `snap-x snap-mandatory` class. With mandatory snap, the browser can snap back to the current card before the smooth scroll completes, resulting in zero visible movement.

2. **No explicit width constraint on the scroll container**: The `desktop-scroll-wrapper` div and its child scroll div rely on inheriting width from the parent `section`. Combined with the global CSS rule `.bob-widget-root * { max-width: none }`, the flex container may be expanding to fit all children rather than constraining itself and creating an actual scrollable overflow.

### Plan

**File 1: `packages/bob-widget/src/components/DesktopScrollArrows.tsx`**
- Add `e.stopPropagation()` to arrow button clicks (prevent any parent event handlers from interfering)
- Set `width: 100%` and `overflow: hidden` on the outer wrapper so the inner scroll container is properly constrained
- Add `console.log` temporarily in the scroll function to confirm it fires (can remove later)

**File 2: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`**
- Remove `snap-x snap-mandatory` from the desktop className (keep it for mobile/tablet only) — snap is the most likely cause of the scroll snapping back to the start position
- Keep `snap-start` on cards for mobile only

**File 3: `packages/bob-widget/src/styles/widget-reset.css`** (no changes needed — existing arrow styles are fine)

### Technical detail

```text
Current broken chain:
  User clicks arrow
  → scrollBy(750px, smooth) called on correct element
  → snap-mandatory snaps back to nearest snap point (position 0)
  → No visible movement

  OR:
  wrapper div has no width constraint
  → flex container expands to fit all 21 cards (5490px)
  → scrollWidth === clientWidth → no actual overflow to scroll
  → scrollBy has nowhere to go

Fix:
  1. Remove snap on desktop so scrollBy moves freely
  2. Force wrapper to width:100% + overflow:hidden
     so inner scroll container is properly bounded
  3. stopPropagation on button clicks for safety
```

### Acceptance checks
- Desktop: clicking right arrow scrolls brake pads row to reveal more products
- Desktop: left arrow appears after scrolling right
- Desktop: arrows disappear on rows with 3 or fewer products
- Mobile: touch swiping still works with snap behavior intact

