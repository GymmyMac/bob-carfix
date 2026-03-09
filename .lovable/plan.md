

# Fix: Merge Follow-Up Products & Scroll to New Items

## Problem
When the user asks Bob for additional parts after the initial load, two things go wrong:
1. **Products replace instead of merge** — `Bob.tsx` line 139 calls `setProducts(dedupedProducts)` which overwrites the entire shelf with only the new parts, losing the originals.
2. **No scroll to new products** — Even if merged, the shelf stays where it is and doesn't guide the user to the newly added items.

## Solution

### 1. Merge new products into existing shelf (`Bob.tsx`)
Change `handlePartsFoundRef` to **append** new products to the existing list instead of replacing. Deduplication by SKU already exists — extend it to also dedupe against the current `products` state.

- Use `setProducts(prev => ...)` functional update
- Merge new products after existing ones
- Deduplicate across the combined set (existing + new)
- Track which partslot categories are **new** (not already in the shelf)

### 2. Auto-scroll to first new category (`Bob.tsx` → `MobileProductColumn`)
- Add a new prop `scrollToCategory?: string | null` to `MobileProductColumn`
- When new products arrive with categories not already on the shelf, pass the first new category name as `scrollToCategory`
- In `MobileProductColumn`, add a `useEffect` that scrolls to that category (similar to existing `highlightedPartType` scroll logic)
- Clear after scroll completes

### 3. Wire through layout components
Pass `scrollToCategory` through: `Bob.tsx` → `MobileBobLayout` → `MobileBobLayoutCore` → `MobileProductColumn`

## Files Changed

| File | Change |
|---|---|
| `packages/bob-widget/src/components/Bob.tsx` | Merge products via functional update; track new categories; pass `scrollToCategory` prop |
| `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx` | Add `scrollToCategory` prop + scroll `useEffect` |
| `packages/bob-widget/src/components/mobile/MobileBobLayoutCore.tsx` | Pass through `scrollToCategory` |
| `packages/bob-widget/src/components/mobile/MobileBobLayout.tsx` | Pass through `scrollToCategory` |
| `packages/bob-widget/src/version.ts` | Bump to 3.2.7 |
| `packages/bob-widget/package.json` | Bump to 3.2.7 |
| `packages/bob-widget/CHANGELOG.md` | Document fix |

