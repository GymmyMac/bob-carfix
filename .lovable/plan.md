

## Product Card Layout Restructure

Currently the card uses a single horizontal row: `[Image] [Details] [+ Button]`. The `+` button steals width from the product title. Based on your reference image, we'll restructure to a two-row layout:

**Row 1**: `[Image] [Full-width title, part number, brand badge, specs, price]`
**Row 2**: `[+ Button pinned to bottom-right corner]`

### Changes (single file: `ProductTile.tsx`)

1. **Remove the `+` button from the horizontal flex row** (lines 200-225) -- move it outside the `flex items-center gap-4` container.

2. **Position the `+` button absolutely** in the bottom-right corner of the card, overlapping the card edge slightly for visual polish:
   - `position: absolute`, `bottom: 12px`, `right: 12px`
   - Reduce size from 56px to 44px (still meets touch target minimum)
   - Keep the green gradient styling

3. **Product details** now span the full remaining width next to the image, giving long product descriptions (like "CASTROL 3377738 GEAR OIL. Designed for high-performance filtration and engine protection") room to display fully.

4. **Add bottom padding** to the card to ensure content doesn't overlap with the repositioned button (add `paddingBottom: '56px'` to the outer container when there's no partslotDescription, or keep existing spacing when there is one).

### Technical Detail

The restructured JSX layout:
```
<div style={{ ...baseGlass, padding: '16px', paddingBottom: '60px', position: 'relative' }}>
  {/* Bob's Pick badge (unchanged) */}
  
  <div className="flex items-start gap-4">   {/* changed items-center to items-start */}
    [Image 92x92]
    [Details - full width, no competing button]
  </div>
  
  {/* Partslot tag (unchanged) */}
  
  {/* + Button - absolute bottom-right */}
  <button style={{ position: 'absolute', bottom: '12px', right: '12px', width: '44px', height: '44px', ... }}>
    +
  </button>
</div>
```

This gives the product title the full card width while keeping the add-to-cart button easily accessible.
