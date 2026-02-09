

# Enrich Partslot Product Cards + Brand Logo Image Fallback

## What's Available But Not Used

The CARFIX API returns these fields per product that are currently **ignored** during mapping in `Bob.tsx`:

| API Field | Content | Currently Used? |
|-----------|---------|-----------------|
| `Web Part Description` | Detailed product description (e.g., "Hydraulic brake caliper seal kit, includes dust boots and piston seals") | No |
| `Brand Description` | Brand's full display name | No |
| `Part Number` | Manufacturer part number (e.g., "D4060-JA00A") | Mapped but not displayed on mobile cards |
| `Per Car Qty` | Quantity needed (e.g., 4 spark plugs for 4-cyl) | No |
| `volume` / `viscosity` | Oil spec info (e.g., "4L", "5W-30") | No |
| `SKU` | Product SKU code | Mapped but not displayed |

## Changes

### 1. Add new fields to Product type (`packages/bob-widget/src/types/product.ts`)

Add optional fields to the `Product` interface:
- `webDescription?: string` -- detailed product description
- `brandDescription?: string` -- brand full name
- `perCarQty?: number` -- quantity per car
- `volume?: string` -- oil volume
- `viscosity?: string` -- oil viscosity
- `brandImageUrl?: string` -- constructed brand logo URL for image fallback

### 2. Map new fields in Bob.tsx product mapping (line 105-121)

Extract the additional fields from the raw API response:
```
webDescription: p["Web Part Description"] || p.web_description || null,
brandDescription: p["Brand Description"] || p.brand_description || null,
partNumber: p["Part Number"] || p.part_number || null,
perCarQty: p["Per Car Qty"] || p.per_car_qty || 1,
volume: p.volume || null,
viscosity: p.viscosity || null,
brandImageUrl: brand ? `https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/brand_images/${brand.replace(/\s+/g, '')}.jpg` : undefined,
```

### 3. Enrich mobile ProductTile card (`packages/bob-widget/src/components/ProductTile.tsx`)

Currently each card shows:
- Product name (e.g., "CALIPER SEAL KIT") -- this is actually the partslot category name, not a real description
- Brand badge
- Price

**After the fix**, each card will show:
- **Product name**: Use `webDescription` if available, fall back to current `name`
- **Part number**: Never show SKU, show part number.
- **Brand badge**: Unchanged
- **Qty indicator**: If `perCarQty > 1`, show "Qty: 4" badge (e.g., spark plugs)
- **Oil specs**: If volume/viscosity present, show "5W-30 / 4L" line
- **Price**: Unchanged

### 4. Brand logo image fallback in ProductTile

When `product.image_url` fails or is missing, fall back to the brand logo image:

```
// Image fallback chain:
// 1. product.image_url (product photo)
// 2. product.brandImageUrl (brand logo)  
// 3. NoImagePlaceholder component
```

Use an `onError` handler on the `<img>` tag to try the brand logo before showing "NO IMAGE".

Also apply the same fallback to `ResponsiveProductCard` (desktop/tablet variants) in `MobileProductColumn.tsx`.

### 5. Summary of files changed

| File | Change |
|------|--------|
| `packages/bob-widget/src/types/product.ts` | Add `webDescription`, `brandDescription`, `perCarQty`, `volume`, `viscosity`, `brandImageUrl` to Product interface |
| `packages/bob-widget/src/components/Bob.tsx` | Map new fields from raw API data during product creation |
| `packages/bob-widget/src/components/ProductTile.tsx` | Display richer info + brand logo image fallback |
| `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx` | Brand logo fallback on desktop/tablet `ResponsiveProductCard` variants |

## What The Cards Will Look Like After

```text
+--------------------------------------------------+
| [Product Image     ]  Web Part Description        |
| (or Brand Logo     ]  Part Number:               |
| (or NO IMAGE       ]  [FRENKI badge] [Qty: 2]     |
|                    ]                               |
|                    ]  $43.00              [+]      |
+--------------------------------------------------+
```

For oil products:
```text
| ...                   5W-30 / 4L                   |
```
