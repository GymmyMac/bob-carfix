
# Investigation Report: Products Not Displaying After Vehicle Lookup

## Summary of Issues

After extensive code analysis and log review, I've identified the exact data flow and potential failure points:

| Status | Component | Finding |
|--------|-----------|---------|
| ✅ Working | Edge Function | Emits `parts_found` with 360 parts correctly |
| ✅ Working | SSE Handler | Receives and logs parts: `Received parts_found event: 360 parts` |
| ✅ Working | Callback Chain | `Bob.tsx` maps products: `Products mapped and setting state: 360 products` |
| ❌ Failing | UI Render | Products don't appear despite state being set |

## Data Flow Verified

```text
bob-chat edge function
    │
    ├── Emits: service_packages_found (6 packages) ✅ DISPLAYS
    ├── Emits: parts_found (360 parts) ✅ RECEIVED
    └── Emits: bob_suggestions (6 products) ✅ PROCESSED

Frontend Handling:
useBobChat.ts → callbacks.onPartsFound() → Bob.tsx setProducts() → ContainedMobileBobLayout → MobileProductColumn

Console Evidence:
[useBobChat] Received parts_found event: 360 parts
[Bob] Products mapped and setting state: 360 products
```

## Root Cause Identified

The issue is **NOT** in data fetching - the 360 parts arrive and are mapped correctly. The problem is in the **rendering chain** between `Bob.tsx` and `MobileProductColumn.tsx`.

### Specific Issue: `groupedProducts` Stale Closure

In `MobileProductColumn.tsx` lines 249-258:
```typescript
const groupedProducts = useMemo(() => {
  const groups: Record<string, Product[]> = {};
  products.forEach(product => {
    const key = product.partslotDescription || 'Other Parts';
    if (!groups[key]) groups[key] = [];
    groups[key].push(product);
  });
  ...
}, [products]);  // ← Dependency is correct but...
```

The `useMemo` depends on `products`, but if `products` reference doesn't change correctly (e.g., if the mapping creates an identical reference somehow), React might skip recalculating.

### Fix Required

1. **Add diagnostic logging** to trace the exact products count at each component level
2. **Force unique array reference** when setting products to ensure React detects the change
3. **Verify `products` prop is actually updating** in `ContainedMobileBobLayout`

## Implementation Plan

### Step 1: Add Diagnostic Logging (Debug Mode)

**File: `packages/bob-widget/src/components/Bob.tsx`**

Add logging after `setProducts`:
```typescript
callbacks.onPartsFound = (parts: unknown[]) => {
  // ... existing mapping code ...
  console.log('[Bob] Products mapped and setting state:', mappedProducts.length, 'products');
  console.log('[Bob] First product:', mappedProducts[0]?.name, mappedProducts[0]?.partslotDescription);
  setProducts(mappedProducts);
};
```

**File: `packages/bob-widget/src/components/mobile/ContainedMobileBobLayout.tsx`**

Add effect to log when products prop changes:
```typescript
useEffect(() => {
  console.log('[ContainedMobileBobLayout] Products prop updated:', products.length);
}, [products]);
```

**File: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`**

Add logging in `groupedProducts` useMemo:
```typescript
const groupedProducts = useMemo(() => {
  console.log('[MobileProductColumn] Grouping products:', products.length);
  const groups: Record<string, Product[]> = {};
  products.forEach(product => {
    const key = product.partslotDescription || 'Other Parts';
    if (!groups[key]) groups[key] = [];
    groups[key].push(product);
  });
  const sortedGroupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
  const result = sortedGroupNames.map(name => ({ name, products: groups[name] }));
  console.log('[MobileProductColumn] Grouped into', result.length, 'categories');
  return result;
}, [products]);
```

### Step 2: Force Array Immutability

**File: `packages/bob-widget/src/components/Bob.tsx`**

Ensure the products array is always a new reference:
```typescript
callbacks.onPartsFound = (parts: unknown[]) => {
  setIsResearching(false);
  
  if (!parts || parts.length === 0) {
    console.log('[Bob] Clearing products (empty array received)');
    setProducts([]);  // New empty array
    originalOnPartsFound?.(parts);
    return;
  }
  
  const mappedProducts: Product[] = (parts as any[]).map((p, idx) => ({
    // ... existing mapping
  }));
  
  console.log('[Bob] Products mapped and setting state:', mappedProducts.length, 'products');
  // Force new array reference to trigger React update
  setProducts([...mappedProducts]);
  originalOnPartsFound?.(parts);
};
```

### Step 3: Add Visibility Debug to MobileProductColumn

**File: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`**

Add visual debug output when products exist but aren't grouped:
```typescript
// After line 290
console.log('[MobileProductColumn] Render check:', {
  productsLength: products.length,
  groupedLength: groupedProducts.length,
  showContent,
  hasContent,
  showLoading,
  visible,
});
```

## Expected Outcome

After these changes:
1. Console will show exactly where products are "lost" in the render chain
2. We can identify if it's a React update issue, a useMemo caching issue, or a visibility condition issue
3. The `[...mappedProducts]` spread ensures React always sees a new array reference

## Verification Steps

1. Open browser DevTools console
2. Navigate to `/ask-bob`
3. Enter a vehicle registration
4. Watch console for the new logs:
   - `[Bob] Products mapped...`
   - `[ContainedMobileBobLayout] Products prop updated...`
   - `[MobileProductColumn] Grouping products...`
   - `[MobileProductColumn] Grouped into X categories`
   - `[MobileProductColumn] Render check...`

If any of these show 0 products while Bob shows 360, we've found the exact breaking point.
