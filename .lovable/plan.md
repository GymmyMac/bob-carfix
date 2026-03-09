

# Fix: Shelf Category Matching Returns Wrong Category

## Problem Found During Testing

When the user asks Bob for "front brake pads", the v3.2.9 post-stream matcher (line 872 of `useBobChat.ts`) matches **"BRAKE FLUID"** instead of **"BRAKE PADS FRONT"** because:

1. The matching uses a simple `responseLower.includes(category.toLowerCase())` — checking if Bob's response text contains the category name as a substring
2. "BRAKE FLUID" matches because "brake" and "fluid" both appear commonly in Bob's response text about brake parts
3. Set iteration order means whichever category is encountered first wins — no scoring

The `matchesPartType` function in `MobileProductColumn.tsx` (line 63) does the **reverse** — it checks if all words in the search term appear in the category name. We need the opposite: check which category's words appear **most completely** in Bob's response, then pick the best match.

## Fix

**File: `packages/bob-widget/src/hooks/useBobChat.ts`** (lines 869-877)

Replace the naive first-match loop with a **scoring approach**:

1. For each shelf category, split it into words (e.g., "BRAKE PADS FRONT" → ["brake", "pads", "front"])
2. Count how many of those words appear in Bob's response text
3. Only consider categories where **all** words match (100% hit rate)
4. Among full matches, pick the one with the **most words** (most specific) — "BRAKE PADS FRONT" (3 words, all match) beats "BRAKE FLUID" (2 words, only "brake" matches since Bob didn't say "fluid" in context of recommending it)

Also check for **service package title matches** — e.g., if Bob mentions "Oil Service" and "Oil Service" is a shelf category, that should match too.

```typescript
// Score each category: count how many of its words appear in the response
let bestMatch: string | null = null;
let bestScore = 0;

for (const category of shelfCategoriesRef.current) {
  const words = category.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = words.filter(w => responseLower.includes(w)).length;
  // Only consider if ALL words match
  if (hits === words.length && hits > bestScore) {
    bestScore = hits;
    bestMatch = category;
  }
}

if (bestMatch) {
  console.log('[useBobChat] v3.2.9 shelf category match:', bestMatch);
  onHighlightPart?.(bestMatch);
}
```

This ensures "BRAKE PADS FRONT" (3/3 words match) wins over "BRAKE FLUID" (only 1/2 words match — "fluid" is unlikely in the response about brake pads).

## Files Changed

| File | Change |
|---|---|
| `useBobChat.ts` | Replace naive `.includes()` loop with word-scoring matcher |
| `version.ts` | Bump to 3.2.10 |
| `package.json` | Bump to 3.2.10 |
| `CHANGELOG.md` | Document fix |

