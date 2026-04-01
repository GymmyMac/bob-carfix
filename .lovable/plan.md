

# TierCard Redesign — Image-Hero Layout (Based on Right-Hand Tile Sketch)

## Reference Design (from your sketch — right tile)

The right-hand tile shows:
1. **★ CARFIX VALUE** banner across the top
2. **Large brand logo** (Repco) dominating the upper ~40% of the card
3. **Tier emoji + name + small brand logo** on a single row below the hero image (⚡ Performance + small Repco logo)
4. **Large bold price** ($115.00) with **SAVE 15%** badge inline, plus "inc.GST" suffix
5. **Green "Add" button** + **red heart icon** side by side at the bottom

## Changes to `TierCard.tsx`

### New layout structure (top to bottom):

```text
┌──────────────────────────┐
│    ★ CARFIX VALUE        │  ← Blue banner (recommended only)
│                          │
│  ┌────────────────────┐  │
│  │                    │  │
│  │   BRAND LOGO       │  │  ← Hero zone: ~100px, white bg
│  │   (large, proud)   │  │     brandImageUrl → fallback chain
│  │                    │  │
│  └────────────────────┘  │
│                          │
│  ⚡ Performance  [logo]  │  ← Tier name + small brand pill
│       3 parts            │
│                          │
│  ~$133.00~               │  ← Strikethrough original (if savings)
│  $115.00  SAVE 15%       │  ← Large price + inline savings badge
│           inc.GST        │
│                          │
│  [ Add ]  ❤️             │  ← Green button + heart icon row
└──────────────────────────┘
```

### Specific changes:

1. **Hero image zone** — 100px tall container with white background and subtle border. Displays the first brand's logo at **48px height** (up from 24px). Uses existing `brandImageUrl` → corrected URL → text fallback chain.

2. **Tier info row** — Horizontal row: tier emoji + tier name + small brand logo pill (24px). Replaces the current vertical stack.

3. **Price section** — Price font increased to **24px** (from 18px). "SAVE X%" badge rendered inline next to the price instead of below it. "inc.GST" as small suffix.

4. **Bottom row** — "Add" button takes ~75% width, a **heart button** (❤️) takes ~25% width beside it. Heart is a placeholder for future "save to wishlist" functionality (fires no callback yet, just visual).

5. **Card widths** — Mobile: 160px, Tablet: 190px, Desktop: 240px (slight increase to fit hero image).

### What stays the same:
- All props, data flow, `handleAdd` logic unchanged
- CARFIX VALUE banner logic unchanged  
- `onAddToCart` callback mapping unchanged
- Brand image fallback chain (same `onError` pattern)

## File
Single file: `packages/bob-widget/src/components/shelf/TierCard.tsx`

