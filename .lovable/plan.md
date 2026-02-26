

# Admin Panel Update: Preferred Brand via `isPreferredBrand` API Flag

## What Changed

CARFIX now manages preferred brands server-side via `cfx_value_config`. The `calculate-service-bundles` API returns `isPreferredBrand: boolean` on every product in `preparedTiers[]`. This makes the local `bob_brand_affinity` table **redundant** for service package recommendations — Bob must derive brand preferences from API data, not from our local table.

## Changes Required

### 1. Remove the Brands tab from Admin panel
The `bob_brand_affinity` table and `BrandAffinityManager` component are superseded by the `isPreferredBrand` flag from the CARFIX API. Remove:
- The "Brands" tab from `src/pages/Admin.tsx` (tab trigger + tab content)
- The import of `BrandAffinityManager`
- The `Heart` icon import (if unused elsewhere)

The `BrandAffinityManager.tsx` file can remain but won't be referenced. The `bob_brand_affinity` table stays in the database (no destructive migration).

### 2. Keep the Promos tab (unchanged)
Promotions are still Bob-managed, time-limited deals. No changes needed.

### 3. Update `bob-chat` edge function — remove brand affinity injection
- Remove `fetchBrandAffinities()` call from the `Promise.all` at line ~2457
- Remove `buildAffinityContextBlock()` call at line ~2466
- Keep the affinity interfaces/functions in place (dead code, harmless) or clean them up
- Keep `fetchActivePromotions()` and `buildPromotionContextBlock()` — promotions still apply

### 4. Update `bob-chat` edge function — add `isPreferredBrand` prompt rules
Add the following to the system prompt (either hardcoded in the edge function's display context section, or as a new `bob_prompts` row):

```
PREFERRED BRAND RULES:
- When presenting service packs, ALWAYS lead with the CARFIX Value tier (isRecommended: true).
- Scan preparedTiers[].products[] for any product with isPreferredBrand: true.
- If NO products have isPreferredBrand: true → Do NOT mention any preferred brand.
- If preferred brand products exist AND are in the Value tier → Mention as bonus: "It includes [Brand], which are our go-to."
- If preferred brand products exist but NOT in Value tier → Mention as upgrade: "If you want our go-to brand, [Brand] is in the [TierName] tier for $[TierPrice]."
- NEVER recommend a brand unless isPreferredBrand: true appears in the actual product data.
```

### 5. Update tab count in Admin grid
Currently 11 columns in the tab grid. Removing Brands drops it to 10.

## Files Changed

| File | Change |
|---|---|
| `src/pages/Admin.tsx` | Remove Brands tab trigger, tab content, import. Update grid to 10 columns. |
| `supabase/functions/bob-chat/index.ts` | Remove `fetchBrandAffinities` from Promise.all, remove `buildAffinityContextBlock` injection, add `isPreferredBrand` prompt rules to system prompt |

## What We Are NOT Doing
- Not dropping the `bob_brand_affinity` database table (non-destructive)
- Not deleting `BrandAffinityManager.tsx` (just unreferenced)
- Not changing the Promos tab or `bob_promotions` table
- Not changing the widget package (no new release needed)

