

# Horizontal Scroll for Product Cards

## What Changes

Convert the vertical stack of product cards within each category (e.g. "SPARK PLUGS", "OIL FILTERS") into a horizontal swipeable row — matching the same scroll-snap pattern already used for service package tier cards.

## File: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

**Lines 967-985** — Replace the vertical `flex-col` layout with a horizontal scroll container:

1. Change outer div from `flex flex-col gap-3` to `flex gap-3 overflow-x-auto snap-x snap-mandatory` with hidden scrollbar styles
2. Each product card gets `snap-start flex-shrink-0` with a fixed width (~75% viewport or ~280px) so ~1.3 cards are visible, hinting there's more to swipe
3. Keep the existing `ResponsiveProductCard` component inside — just wrap it in the snap container

### Desktop behavior
On desktop/tablet viewports, the cards should show 2-3 per row. Use viewport-aware width: mobile = 75%, tablet = 45%, desktop = 32%.

## File: `packages/bob-widget/src/components/ProductTile.tsx`

Minor tweak: ensure the tile doesn't force `w-full` when inside the horizontal scroll (it already uses `w-full` which will fill the snap container width — this should work as-is).

## Visual Result
- Category header pill stays full-width above
- Below it: horizontally swipeable product cards with snap points
- ~1.3 cards visible = clear affordance to swipe
- Matches the tier card UX pattern already in use

| File | Change |
|------|--------|
| `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx` | Convert product grid to horizontal scroll-snap row |

