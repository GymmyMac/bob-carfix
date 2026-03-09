

# Fix: Tighten Brake Type Detection to Require Non-Zero Pricing

## Problem
`detectAvailableBrakeTypes` checks only whether products with drum/disc keywords exist by `partslotName`. For KMT21, the API returns partslots named "BRAKE SHOE REAR" / "BRAKE DRUM REAR" but with `displayPrice: 0`. The current detection returns `hasDrum: true`, so the toggle still appears.

## Fix
Add a `displayPrice > 0` check to the detection function. No API debugging needed -- the data shape is already known from the `PreparedTierProduct` type which includes `displayPrice`.

### Changes

**`packages/bob-widget/src/utils/rearBrakeFilter.ts`** and **`src/utils/rearBrakeFilter.ts`** (both copies):

Tighten the generic constraint and add price check:

```typescript
export function detectAvailableBrakeTypes<T extends { partslotName: string; displayPrice: number }>(
  tiers: Array<{ products: T[] }>
): { hasDisc: boolean; hasDrum: boolean } {
  const allProducts = tiers.flatMap(t => t.products);
  const hasDisc = allProducts.some(p => {
    const name = p.partslotName.toUpperCase();
    return p.displayPrice > 0 && DISC_KEYWORDS.some(kw => name.includes(kw));
  });
  const hasDrum = allProducts.some(p => {
    const name = p.partslotName.toUpperCase();
    return p.displayPrice > 0 && DRUM_KEYWORDS.some(kw => name.includes(kw));
  });
  return { hasDisc, hasDrum };
}
```

**`packages/bob-widget/src/__tests__/rearBrakeFilter.test.ts`**: Update test fixtures to include `displayPrice` and add a test case for zero-priced products returning false.

| File | Change |
|---|---|
| `packages/bob-widget/src/utils/rearBrakeFilter.ts` | Add `displayPrice > 0` check |
| `src/utils/rearBrakeFilter.ts` | Same |
| `packages/bob-widget/src/__tests__/rearBrakeFilter.test.ts` | Update fixtures, add zero-price test |

