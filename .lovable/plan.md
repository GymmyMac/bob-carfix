

# Updated Plan: Fix Double-Fetch Bug + Optimize Data Flow

## Current Issues
1. **Double-fetch overwrites good data** — LLM redundantly calls `lookup_vehicle` after deterministic fetch, overwrites correct packages with wrong-vehicle results
2. **Preferred brand fallback re-fetches on every turn** — adds latency by calling `retrieveServicePackages` again when data was already available
3. **Full preparedTiers sent to LLM context** — massive payload slows inference; LLM only needs summaries to discuss packages

## Implementation Steps

### 1. Guard against data overwrite in tool handlers
In `bob-chat/index.ts`, in the `lookup_vehicle`, `retrieve_parts`, and `retrieve_service_packages` tool result handlers: skip processing if `_confirmedVehicle` is already set from the deterministic fetch. Return a "vehicle already confirmed" message to the AI instead of calling the API again.

### 2. Cache preferred brand context — stop re-fetching
Store the preferred brand summary string (built during the initial package fetch) in the conversation state. On follow-up messages, inject the cached string directly instead of calling `retrieveServicePackages` again. Remove the "Persistent Preferred Brand Fallback" block (lines ~3387-3441).

### 3. Send package summaries only to LLM context (not full preparedTiers)
When building the display context / system prompt for the LLM, send only a compact summary per package:
- Package title, from_price, tier count
- Per visible tier: tierName, totalPrice, isRecommended, dominantBrand, productCount
- Per product: partslotName, brand, displayPrice, isPreferredBrand (only if true)

Do NOT include: SKUs, image URLs, part numbers, web descriptions, brandImageUrl, productImageUrl, viscosity, volume, or other render-only fields. The full `preparedTiers[]` data continues to flow to the frontend via SSE for rendering — this change only affects what the LLM sees.

### 4. Skip redundant data fetches when already loaded
In the deterministic fetch path and tool call handlers, check if `_partsToEmit` / `_servicePackagesToEmit` already contain data before populating:
```
if (!existing._partsToEmit || existing._partsToEmit.length === 0) {
  existing._partsToEmit = result;
}
```
Same guard for `_servicePackagesToEmit`.

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/bob-chat/index.ts` | All 4 fixes above |

## What We Are NOT Doing
- Not changing the SSE payload to the frontend (full preparedTiers still sent for rendering)
- Not splitting the API into separate calls (future consideration)
- Not changing any widget/frontend code

