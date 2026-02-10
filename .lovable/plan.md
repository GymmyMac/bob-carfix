

## Problem: Duplicate Products on the Shelf

The API returns multiple entries with the same SKU (e.g., "VXK-17002" LuK Clutch Kit appears 3 times). There is **no deduplication logic anywhere** in the pipeline:

1. `Bob.tsx` maps raw API parts to `Product[]` without filtering duplicates
2. `MobileProductColumn.tsx` groups products by `partslotDescription` but does not remove duplicates within groups
3. `ProductShelf.tsx` (desktop legacy) also has no dedup

This means if the CARFIX API returns the same SKU multiple times (which it does for some vehicles), the shelf shows the same product card repeated.

---

## Plan

### 1. Add SKU-based deduplication in Bob.tsx (the single mapping point)

In `packages/bob-widget/src/components/Bob.tsx`, after the `mappedProducts` array is built (around line 130), add a deduplication step that keeps only the first occurrence of each SKU:

```typescript
// Deduplicate by SKU - API may return the same part multiple times
const seen = new Set<string>();
const dedupedProducts = mappedProducts.filter(p => {
  if (!p.sku || seen.has(p.sku)) return false;
  seen.add(p.sku);
  return true;
});
```

Then pass `dedupedProducts` to `setProducts()` instead of `mappedProducts`.

Update the log line to show both counts so we can verify:
```
console.log('[Bob] Products mapped:', mappedProducts.length, '-> deduped:', dedupedProducts.length);
```

### 2. No changes needed elsewhere

Since deduplication happens at the data source (Bob.tsx is the single point where API data enters the frontend), both `MobileProductColumn` and `ProductShelf` will automatically receive clean data. No changes needed in those components.

---

## Technical Notes

- Dedup uses SKU as the unique key since that is the product identifier from the CARFIX API
- First occurrence is kept (preserving the original API ordering)
- Products without a SKU are excluded (they would be invalid anyway)
- This is a one-file change in `packages/bob-widget/src/components/Bob.tsx`, approximately 6 lines added

