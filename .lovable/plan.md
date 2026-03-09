

# Fix: Wire onAddToCart to ProductTile Green "+" Button

## Problem
The green "+" button on each partslot product tile in `MobileProductColumn` does nothing. The `onAddToCart` prop is accepted by `MobileProductColumn` (line 53) and used for service package tier "Add" buttons (line 734), but it is **never passed** to the `ProductCard` wrapper component (line 85-101), which renders `ProductTile` without an `onAddToCart` callback. The button calls `onAddToCart?.(product)` inside `ProductTile` — but since it's undefined, nothing happens.

## Fix

### `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

1. Add `onAddToCart` to the `ProductCard` sub-component's props (line 84-90)
2. Pass it through to `<ProductTile onAddToCart={onAddToCart} />` (line 94-98)
3. Pass `onAddToCart` when rendering `<ProductCard>` in the product list (wherever `ProductCard` is used in the file)

This is a 3-line change — add the prop to the interface, destructure it, and pass it through.

### Files changed

| File | Change |
|---|---|
| `MobileProductColumn.tsx` | Add `onAddToCart` prop to `ProductCard`, pass through to `ProductTile` |

