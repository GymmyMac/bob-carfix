
Goal: make desktop product rows clearly scrollable when there are more cards than fit on screen, instead of relying on a native scrollbar that may be hidden or clipped by the browser/OS.

What I found
- The desktop rows already use `overflow-x-auto` and the `product-scroll-row` class.
- The CSS for a thin desktop scrollbar exists in `packages/bob-widget/src/styles/widget-reset.css`.
- There are no console errors, so this is not a JS failure.
- The problem is structural/discoverability:
  1. native desktop scrollbars can still be invisible in some environments even when styled,
  2. the outer layout uses clipping/hidden overflow wrappers, so a thin bottom scrollbar can be hard to see or visually clipped,
  3. product cards use percentage widths on desktop (`32%`), so overflow may be slight and the scrollbar affordance is weak.

Plan
1. Fix the desktop product row itself
- In `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`, change desktop product cards from percentage width to a fixed width/min-width so overflow is guaranteed and consistent.
- Add a row-level desktop wrapper that reserves bottom space for controls so nothing gets hidden.

2. Stop depending on the browser’s native scrollbar as the main desktop affordance
- Add explicit desktop left/right scroll controls to each overflowing product row.
- Only show them on desktop and only when the row actually overflows.
- Keep mobile exactly as-is with swipe scrolling.

3. Measure overflow in the component
- For each `product-scroll-row`, detect:
  - `scrollWidth > clientWidth`
  - whether the row is at the far left, middle, or far right
- Use that state to:
  - show/hide arrows,
  - disable the left arrow at the start,
  - disable the right arrow at the end.

4. Improve desktop visual affordance
- Add a visible “scroll for more” treatment on desktop:
  - left/right arrow buttons over the row edges, and/or
  - subtle edge fade masks to indicate hidden content off-screen.
- Keep the thin native scrollbar as a secondary fallback, not the primary control.

5. Adjust CSS so controls are not clipped
- Update `packages/bob-widget/src/styles/widget-reset.css` and, if needed, the relevant row/container styles in `MobileProductColumn.tsx` so desktop controls have enough bottom/side space.
- Ensure the arrows sit inside the row section and above the cards with appropriate z-index.

Files to update
- `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`
- `packages/bob-widget/src/styles/widget-reset.css`

Expected result
- On desktop, any row with more items than fit will clearly show that it can scroll.
- Users can click left/right controls to move through all products.
- Mobile swipe behaviour remains unchanged.
- Native scrollbar visibility differences between operating systems will no longer block usability.

Technical details
```text
Current issue:
Desktop row relies on native scrollbar visibility
        +
OS/browser may hide overlay scrollbar
        +
row sits inside visually dense / clipped layout
        =
user sees overflow but no clear control

Proposed desktop behavior:
[<]  product row ..................................  [>]
     cards overflow horizontally
     arrows appear only if row overflows
     arrows update enabled/disabled state as user scrolls
```

Why this approach
- It solves the actual user problem: discoverable desktop navigation.
- It avoids fighting OS-level scrollbar behavior.
- It is more robust than trying to force a thin native scrollbar to always appear.

Acceptance checks
- Desktop: rows with 1–3 visible cards and no overflow show no arrows.
- Desktop: rows with overflow show arrows and can scroll fully left/right.
- Desktop: brake pads row with many products can be navigated across all items.
- Mobile/tablet: swipe interaction still works and desktop arrows do not appear.
