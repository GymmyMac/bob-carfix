

# Fix: onAddToCart Payload — Both Manual Click and Bundle Tier Paths

## Problem

The `onAddToCart` callback payload is incomplete in v3.2.13. Two distinct add-to-cart paths exist, and both are broken:

1. **Manual click** — User taps the green "+" on a `ProductTile`. The `Product` object flows through correctly, but `Bob.tsx` never populates `vehicle_id` from `bobChat.identifiedVehicle`.

2. **Bundle tier add** — User taps "Add" on a service package tier. `MobileProductColumn` and `ServicePackageDetailView` build product arrays but never attach bundle metadata (`is_bundle_item`, `bundle_discount_percentage`, `service_package_name`, etc.). `Bob.tsx` then maps these to `CartItem` without any bundle context. Additionally, `ServicePackageDetailView` passes raw tier product objects (with `displayPrice`, not `price`; with `sku` but `id` may be missing), causing field mismatches in `Bob.tsx`.

CARFIX's handler expects all of these fields and silently drops items when they're missing.

## Changes

### 1. Extend `CartItem` type (`packages/bob-widget/src/types/context.ts`)

Add optional bundle fields to match the CARFIX contract:
- `is_bundle_item?: boolean`
- `bundle_discount_percentage?: number`
- `service_package_name?: string`
- `service_package_id?: string`
- `quality_tier?: string`

### 2. Add `_bundleMeta` to Product type (`packages/bob-widget/src/types/product.ts`)

Add an optional `_bundleMeta` bag so tier-add code can attach metadata that `Bob.tsx` forwards:
```typescript
_bundleMeta?: {
  is_bundle_item: boolean;
  bundle_discount_percentage: number;
  service_package_name: string;
  service_package_id?: string;
  quality_tier?: string;
};
```

### 3. Embed bundle metadata in tier adds

**`MobileProductColumn.tsx` (line ~723):** When building `productsToAdd`, attach `_bundleMeta` with package title, discount percentage, and tier name.

**`ServicePackageDetailView.tsx` (line ~83-94):** Same treatment. Also normalize the product shape (map `displayPrice` → `price`, ensure `id` is set from `sku`).

### 4. Update both `Bob.tsx` handlers (lines 315-327 and 373-385)

- Populate `vehicle_id` from `bobChat.identifiedVehicle?.vehicle_id`
- Spread `product._bundleMeta` into the `CartItem` when present
- Single handler extracted as a named function to eliminate duplication

```typescript
const handleAddToCart = (productOrProducts: Product | Product[]) => {
  const items = Array.isArray(productOrProducts) ? productOrProducts : [productOrProducts];
  const vehicleId = bobChat.identifiedVehicle?.vehicle_id?.toString();
  items.forEach(product => {
    callbacks.onAddToCart?.({
      product_id: product.id,
      product_name: product.name,
      quantity: product.quantity || 1,
      unit_price: product.price,
      sku: product.sku,
      brand: product.brand,
      image_url: product.image_url,
      vehicle_id: vehicleId,
      ...product._bundleMeta,
    });
  });
};
```

### 5. Version bump to 3.2.14

Update `package.json`, `version.ts`, and `CHANGELOG.md`.

## Files Changed

| File | Change |
|---|---|
| `types/context.ts` | Add bundle fields to `CartItem` |
| `types/product.ts` | Add optional `_bundleMeta` to `Product` |
| `Bob.tsx` | Extract shared handler, add `vehicle_id` and spread `_bundleMeta` |
| `MobileProductColumn.tsx` | Attach `_bundleMeta` to tier product arrays |
| `ServicePackageDetailView.tsx` | Attach `_bundleMeta`, normalize product shape |
| `package.json` | Bump to 3.2.14 |
| `version.ts` | Bump to 3.2.14 |
| `CHANGELOG.md` | Document fix |

