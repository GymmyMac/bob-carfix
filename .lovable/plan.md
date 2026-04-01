# Option C: Full Shelf Rebuild — Specification and Plan

## Current State Assessment

`MobileProductColumn.tsx` is **1019 lines** handling 10+ responsibilities: shelf layout, vertical scroll, sticky header, variant selection, service package rendering (tiers, brake toggle, accordion, add-to-cart mapping), partslot row rendering, desktop arrow integration, highlight/navigation, loading/empty states, and scroll progress tracking.

`ServicePackageDetailView.tsx` (503 lines) duplicates brake filter logic and tier rendering.

`DesktopScrollArrows.tsx` wraps rows but fights global CSS resets. Scroll containment leaks across layers.

---

## Phase 1: Document the Shelf Behavior Spec

Before any code changes, a `SHELF-SPEC.md` file will be created as the source of truth.

### Shelf Sections (top to bottom)

1. **ShelfHeader** — sticky blue pill with vehicle name, item count.
2. **VariantSelection** — vehicle variant cards (only shown when `pendingVariants` exists)
3. **ServicePackageSection** — one card per package, each containing:
  - Blue gradient header (title, estimated time)
  - Description + optional disc/drum toggle
  - Horizontal tier card row (scrollable on all viewports)
  - "Show details" accordion with product list
  - Add-to-cart per tier
  - Small heart icon per tier that saves the products to the customer's saved items list.
4. **PartsSection** — one section per partslot group:
  - Blue pill header with name + count badge
  - Horizontal product card row (scrollable on all viewports)
  - product display small heart icon per tier that saves the products to the customer's saved items list.
5. **Loading/Empty states**
6. **Scroll progress dot** (fixed position indicator)

### Scroll Rules


| Context                       | Mobile                                                             | Tablet            | Desktop                             |
| ----------------------------- | ------------------------------------------------------------------ | ----------------- | ----------------------------------- |
| Shelf (vertical)              | touch scroll, overscroll-contain                                   | same              | same                                |
| Product row (horizontal)      | snap-x mandatory, 65% card width, peek effect                      | snap-x, 45% width | no snap, 250px cards, arrow buttons |
| Service tier row (horizontal) | 150px cards                                                        | 180px cards       | 220px cards, arrow buttons          |
| Gesture isolation             | `touch-action: pan-x` + `overscroll-behavior: contain` on each row | same              | N/A (arrows only)                   |


### Navigation Behaviors

- `highlightedPartType` — scroll to matching partslot section, highlight header
- `scrollToCategory` — scroll to matching section, fire completion callback
- `highlightedProduct` — spotlight badge on matching product card
- Service package titles are registered as scroll anchors via `groupRefs`

---

## Phase 2: New Component Architecture

```text
packages/bob-widget/src/components/shelf/
  ShelfColumn.tsx          ← Main container (replaces MobileProductColumn)
  ShelfHeader.tsx          ← Sticky header with vehicle name
  ShelfLoadingState.tsx    ← Loading/empty states
  VariantSelector.tsx      ← Vehicle variant cards
  HorizontalRow.tsx        ← THE shared scroll primitive (arrows + snap + gestures)
  ServicePackageCard.tsx   ← Single service package (header + tiers + accordion)
  TierCard.tsx             ← Single tier within a package
  TierProductList.tsx      ← Accordion product details for selected tier
  PartslotSection.tsx      ← Header + HorizontalRow of ProductTiles
  index.ts                 ← Barrel export
```

### HorizontalRow — The Key Primitive

This is the single component that controls ALL horizontal scrolling:

- Receives `viewportSize` to decide: snap vs arrows vs both
- Owns its own `ref`, `scrollTo` logic, overflow detection
- Desktop: renders arrow buttons inside itself (no wrapper needed)
- Mobile/Tablet: applies `snap-x snap-mandatory`, `touch-action: pan-x`, `overscroll-behavior: contain`
- Enforces `width: 100%; overflow: hidden` on wrapper, `overflow-x: auto` on scroll track
- Arrow click uses `scrollTo` with `stopPropagation` + `preventDefault`
- Fade masks built in

### Component Sizes (estimated)


| Component          | Lines |
| ------------------ | ----- |
| ShelfColumn        | ~120  |
| ShelfHeader        | ~40   |
| ShelfLoadingState  | ~30   |
| VariantSelector    | ~80   |
| HorizontalRow      | ~120  |
| ServicePackageCard | ~180  |
| TierCard           | ~100  |
| TierProductList    | ~60   |
| PartslotSection    | ~60   |


Total: ~790 lines across 9 files vs 1019 in one file today.

---

## Phase 3: Implementation Order

1. **Create `SHELF-SPEC.md**` — document above spec as project reference
2. **Create `HorizontalRow.tsx**` — the scroll primitive, tested in isolation
3. **Extract `ShelfHeader.tsx**`, `ShelfLoadingState.tsx`, `VariantSelector.tsx` — simple extractions
4. **Create `TierCard.tsx**` and `TierProductList.tsx`** — tier rendering from one source
5. **Create `ServicePackageCard.tsx**` — compose tier cards + brake toggle + accordion
6. **Create `PartslotSection.tsx**` — header + HorizontalRow + ProductTile cards
7. **Create `ShelfColumn.tsx**` — compose all sections, own vertical scroll + navigation
8. **Update parent integrations** — swap `MobileProductColumn` import for `ShelfColumn`
9. **Clean up** — remove `DesktopScrollArrows.tsx`, old CSS overrides in `widget-reset.css`
10. **Rename old file** — keep `MobileProductColumn.tsx.bak` as backup reference

### What stays unchanged

- `ProductTile.tsx` — already a clean leaf component
- `carfix-tokens.ts`, `glass.ts` — shared style tokens
- `rearBrakeFilter.ts` — shared utility (used from one place now instead of two)
- All props/callbacks from parent components — API-compatible swap

### CSS Changes

- Remove all `.desktop-scroll-*` rules from `widget-reset.css`
- Arrow + fade styles move into `HorizontalRow.tsx` as inline styles (self-contained)
- Remove `product-scroll-row` global class dependency

---

## Risk Mitigation

- Old `MobileProductColumn.tsx` kept as `.bak` for reference
- New `ShelfColumn` accepts identical props — drop-in replacement
- Implementation is additive: new files created first, swap happens last
- Each component can be tested independently before integration