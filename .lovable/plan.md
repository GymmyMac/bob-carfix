

# Fix: Scroll Shelf to Requested Products During Follow-Up Conversations

## Current Problem

When a user asks Bob for additional parts (e.g., "I want front brake pads"), Bob responds correctly but the shelf doesn't scroll to show those products. Two issues:

1. **No new `parts_found` SSE event fires** — the full 500-part catalog was already loaded on vehicle identification. The brake pads are already on the shelf; there's nothing new to trigger the v3.2.7 `scrollToCategory` logic (which only fires when *new* products are merged).

2. **No `highlight_category` SSE event fires** — the backend doesn't emit a `highlight_category` event for follow-up part requests. It only fires during diagnostic flows.

3. **The legacy keyword scan was removed in v3.2.6** — that was the only client-side mechanism that could have triggered a scroll, but it was too aggressive (fired on greetings). Now there's *nothing* triggering scrolls for follow-up requests.

## Proposed Solution: Server-Driven `highlight_category` Events

The most robust approach is to have the backend emit `highlight_category` SSE events whenever Bob discusses a specific part type. This keeps the client simple — it already handles `highlight_category` correctly (line 751 of `useBobChat.ts`).

However, since we can't wait for a backend change, we implement a **targeted client-side fallback** that only fires when Bob's response contains product suggestions — not on every message.

### Architecture

```text
User asks for "front brake pads"
  → bob-chat responds with text mentioning brake pads
  → SSE stream completes
  → Client checks: did Bob's response contain suggested products? (suggestedProducts field)
     OR: did Bob's response mention a category that exists on the shelf?
  → If yes → fire onHighlightPart with the matched category name
  → MobileProductColumn scrolls to that section
```

### Implementation

**File: `packages/bob-widget/src/hooks/useBobChat.ts`**
- After the SSE stream completes, check if the backend emitted a `highlight_category` event during this stream. If it did, the existing handler (line 751) already took care of it — do nothing.
- If no `highlight_category` was emitted AND products exist on the shelf, do a **targeted category match**: compare the assistant's response against the *actual partslot names on the shelf* (not a hardcoded keyword list). Only match if the response contains a specific partslot name like "BRAKE PADS FRONT" or close variant.
- This is fundamentally different from the removed v3.2.6 keyword scan because it matches against **real shelf categories** rather than generic words, and only fires when the shelf has content.

**New callback: `onMatchShelfCategory`**
- Pass the current product list's category names into `useBobChat` so it can match Bob's response against actual shelf contents.
- Alternatively, simpler: add a `shelfCategories` ref that `Bob.tsx` keeps updated from its products state.

**File: `packages/bob-widget/src/components/Bob.tsx`**
- Maintain a `shelfCategoriesRef` that updates whenever `products` changes — a `Set<string>` of all unique `partslotDescription` values currently on the shelf.
- Pass this ref (or a callback) to `useBobChat` so it can match against real categories.

**File: `packages/bob-widget/src/hooks/useBobChat.ts`** (stream completion handler)
- After stream ends, if no `highlight_category` was received during this stream:
  1. Get the assistant's final response text
  2. For each category in `shelfCategoriesRef.current`, check if the response text mentions it (using `matchesPartType` logic)
  3. If a match is found, call `onHighlightPart(matchedCategory)`
- Track whether `highlight_category` fired during the current stream with a simple boolean flag reset at stream start.

### Why This Is Robust

- **No hardcoded keywords** — matches against actual shelf content, so it works for any vehicle's catalog
- **Server takes priority** — if the backend sends `highlight_category`, the client fallback is skipped
- **Shopping list friendly** — each follow-up request triggers a scroll to the relevant section
- **No false positives on greetings** — Bob's greeting doesn't mention specific partslot names like "BRAKE PADS FRONT"

## Files Changed

| File | Change |
|---|---|
| `useBobChat.ts` | Add `highlightCategoryReceived` flag per stream; add post-stream shelf category matching fallback; accept `shelfCategoriesRef` option |
| `Bob.tsx` | Maintain `shelfCategoriesRef` from products state; pass to `useBobChat` |
| `version.ts` | Bump to 3.2.9 |
| `package.json` | Bump to 3.2.9 |
| `CHANGELOG.md` | Document fix |

## Scope
~30 lines added across 2 files + version bump in 3 files.

