

## Fix: Product Card Hover Overflow Clipping

The product cards use `scale(1.04)` on hover, but the scroll container has `overflow-x-hidden` which clips the scaled cards on the left and right edges (visible in your screenshot where the card extends beyond the container boundary).

### Solution: Add horizontal padding instead of removing overflow-x-hidden

We can't remove `overflow-x-hidden` because that would cause a horizontal scrollbar. Instead, we'll add enough horizontal padding inside the scroll container so that when a card scales up by 4%, it stays within bounds.

A card at full container width scaled by 1.04 extends ~2% on each side. Adding a few extra pixels of padding on both left and right absorbs this.

### Changes (single file)

**`packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`** (line ~270-272):

- Increase `paddingLeft` from `12px` to `16px`
- Increase `paddingRight` from `6px` to `16px`

This gives enough breathing room for the `scale(1.04)` hover effect without clipping, while keeping `overflow-x-hidden` to prevent any horizontal scroll.

