

# Shelf Navigation Coordination — Rules-Based System

## The Problem

Bob says "I've got a Front Brake Service package for you" but the shelf scrolls to the "BRAKE PADS" partslot section instead. This happens because:

1. **No priority system** — service package titles and partslot names compete equally in the word-matching algorithm
2. **Greedy matching** — "brake" appears in both "Front Brake Service" (package) and "BRAKE PADS" (partslot), so whichever scores highest by raw word count wins
3. **No intent awareness** — the matcher doesn't know whether Bob is recommending a package or a part

## The Fix: Priority-Aware Shelf Navigation

### Rule 1: Service Packages Always Win Ties
When Bob's response matches both a service package title AND a partslot name, the service package takes priority. This aligns with the sales workflow (packages first, parts second).

### Rule 2: Intent Keywords Boost Priority
Certain phrases signal Bob is talking about a package vs a part:
- **Package signals**: "service pack", "package", "bundle", "service", "complete", "kit"
- **Part signals**: "individual", "just the", "single", "part", "grab a"

When a package signal is detected, only service package titles are considered. When a part signal is detected, only partslot names are considered. When neither is detected, both compete but packages get a tiebreaker bonus.

### Rule 3: Server-Side Hint Takes Absolute Priority
If the SSE stream sends a `highlight_category` event, that overrides all client-side matching (this already works but is rarely sent).

### Rule 4: Highlighted Product Scrolls to Its Section
When `onHighlightProduct` fires (Bob recommends a specific brand + price), the shelf should scroll to the section containing that product, not just highlight the card in place.

## Implementation

### Changes to `useBobChat.ts` (post-stream matching block, ~lines 850-871)

Replace the single flat loop with a two-pass system:

```text
1. Separate shelfCategoriesRef into two sets:
   - packageTitles (from servicePackages)
   - partslotNames (from products)

2. Detect intent from Bob's response text:
   - packageIntent = response contains package signal words
   - partIntent = response contains part signal words

3. Match against the appropriate set:
   - If packageIntent → match only packageTitles
   - If partIntent → match only partslotNames  
   - If ambiguous → match both, but packageTitles get +1 bonus score

4. Fire onHighlightPart with the winning match
```

### Changes to `Bob.tsx` (shelfCategoriesRef management)

Store categories with their type so the matcher can distinguish them:

```text
shelfCategoriesRef: Map<string, 'package' | 'partslot'>
  - Service package titles → tagged as 'package'
  - Product partslot descriptions → tagged as 'partslot'
```

### Changes to `ShelfColumn.tsx` (scroll targeting)

When `highlightedPartType` is set and matches a service package title, scroll to the service package section first (it renders above parts sections in the DOM, so this mostly works already — but the `matchesPartType` function needs to check service package refs too, which it currently does).

### No visual changes needed
The shelf already highlights headers and scrolls smoothly. The only change is **which section gets targeted**.

## Files Modified
1. **`packages/bob-widget/src/hooks/useBobChat.ts`** — Replace flat word-matching with priority-aware two-pass matcher
2. **`packages/bob-widget/src/components/Bob.tsx`** — Change `shelfCategoriesRef` from `Set<string>` to `Map<string, 'package' | 'partslot'>`

## Estimated Scope
~50 lines changed across 2 files. No new components. No visual changes.

