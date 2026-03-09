

# Fix: Hide Disc/Drum Toggle When Vehicle Has Only One Brake Type (v3.2.12)

## Problem
The Rear Brake Service package always shows the Disc/Drum toggle, even when a vehicle only has one type. Selecting the empty type shows $0.00 prices with brand logos still visible — misleading to customers.

## Solution — Frontend Only
The `preparedTiers` data already contains all products with `partslotName` values like "BRAKE PADS REAR", "BRAKE SHOE REAR", etc. We can detect at render time whether disc products exist, drum products exist, or both, using the existing keyword lists in `rearBrakeFilter.ts`.

### New utility function in `rearBrakeFilter.ts`

Add `detectAvailableBrakeTypes` that scans all products across all tiers:
- If products contain PAD/ROTOR keywords → disc is available
- If products contain SHOE/DRUM keywords → drum is available
- Returns `{ hasDisc, hasDrum }`

### Component changes (both files)

In `ServicePackageDetailView.tsx` and `ServicePackageDetailDialog.tsx`:

1. Call `detectAvailableBrakeTypes` on the unfiltered `preparedTiers` products
2. Auto-set `rearBrakeType` default to whichever type is available (disc preferred when both exist)
3. Only render the toggle when **both** `hasDisc` and `hasDrum` are true
4. When only one type exists, silently filter to that type — no toggle shown

### Files changed

| File | Change |
|---|---|
| `packages/bob-widget/src/utils/rearBrakeFilter.ts` | Add `detectAvailableBrakeTypes()` |
| `src/utils/rearBrakeFilter.ts` | Same addition (shared copy) |
| `packages/bob-widget/src/components/mobile/ServicePackageDetailView.tsx` | Conditional toggle + auto-default |
| `src/components/ServicePackageDetailDialog.tsx` | Same conditional toggle + auto-default |
| `packages/bob-widget/src/__tests__/rearBrakeFilter.test.ts` | Tests for new detection function |

### Logic detail

```typescript
export function detectAvailableBrakeTypes<T extends { partslotName: string }>(
  tiers: Array<{ products: T[] }>
): { hasDisc: boolean; hasDrum: boolean } {
  const allProducts = tiers.flatMap(t => t.products);
  const hasDisc = allProducts.some(p => {
    const name = p.partslotName.toUpperCase();
    return DISC_KEYWORDS.some(kw => name.includes(kw));
  });
  const hasDrum = allProducts.some(p => {
    const name = p.partslotName.toUpperCase();
    return DRUM_KEYWORDS.some(kw => name.includes(kw));
  });
  return { hasDisc, hasDrum };
}
```

In components: `{isRearBrake && hasDisc && hasDrum && ( <toggle /> )}` — toggle only renders when both types have real products.

