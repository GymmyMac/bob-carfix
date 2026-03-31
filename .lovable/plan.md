
Goal: fix the desktop arrow so clicking it actually scrolls the product row, and make the control more visible.

What’s broken
- The arrow is rendering, so overflow detection is at least partially working.
- But `DesktopScrollArrows` is calling `scrollBy()` on its own wrapper div, not on the actual horizontal scroller.
- In `MobileProductColumn.tsx`, the real scrollable element is the nested child with:
  - `overflow-x-auto`
  - `product-scroll-row`
- In `DesktopScrollArrows.tsx`, the ref is attached to an outer wrapper around `{children}`. That wrapper does not own the overflow, so clicking the arrow does nothing.

Why this happened
```text
Current structure:
DesktopScrollArrows
  └─ div(ref=scrollRef)   <- NOT the real scroller
       └─ div.product-scroll-row overflow-x-auto  <- actual scroller

Result:
arrow click -> scrollBy() on wrong element -> no movement
```

Plan
1. Refactor `DesktopScrollArrows.tsx` so it controls the real scroll element
- Stop wrapping an already-scrollable child with another ref container.
- Update the component so the element with `ref={scrollRef}` is also the horizontal scroller.
- Best approach: let `DesktopScrollArrows` render the scroll row itself via `className`, `style`, and `children`, instead of expecting a nested scrollable div.

2. Update usage in `MobileProductColumn.tsx`
- Replace:
  - `<DesktopScrollArrows><div className="... product-scroll-row ...">...</div></DesktopScrollArrows>`
- With:
  - `<DesktopScrollArrows className="... product-scroll-row ..." style={...}>...</DesktopScrollArrows>`
- Keep all current row behavior:
  - `overflow-x-auto`
  - `snap-x snap-mandatory`
  - touch scrolling
  - `product-scroll-row` class

3. Keep desktop-only arrow behavior
- Arrows should still only show when:
  - `viewportSize === 'desktop'`
  - row actually overflows
- Continue using:
  - `scrollWidth > clientWidth`
  - `scrollLeft` checks for left/right enablement

4. Improve button visibility
- Update `widget-reset.css` so the desktop arrow stands out more:
  - brighter accent background or stronger contrast
  - stronger border / glow
  - clearer hover state
- Keep fade masks secondary to the arrow.

Files to update
- `packages/bob-widget/src/components/DesktopScrollArrows.tsx`
- `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`
- `packages/bob-widget/src/styles/widget-reset.css`

Expected result
- Desktop rows with overflow show a clearly visible right arrow.
- Clicking the arrow moves the row horizontally.
- Left arrow appears after moving right.
- Mobile swipe behavior remains unchanged.

Technical details
```text
Fix target:
Attach the ref and onScroll handler to the same element that has overflow-x-auto.

Correct structure:
DesktopScrollArrows
  └─ div(ref=scrollRef, className="overflow-x-auto product-scroll-row ...")
       └─ cards...

Then:
scrollBy() -> correct element -> row moves
```

Acceptance checks
- VW Golf brake pad row scrolls when right arrow is clicked.
- Left arrow appears after first movement.
- Right arrow disappears at end of row.
- Button is visually obvious on desktop.
- No regression to mobile/tablet scrolling.
