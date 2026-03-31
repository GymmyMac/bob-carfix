

# Fix: Service Pack Container Wrapping & Gap Restoration

## Issues from Screenshot

1. **White container doesn't wrap around all tier options** — The white card with rounded corners and the blue header are constrained to the visible viewport width. When tier cards scroll horizontally, the blue header and white background should extend with them (i.e., the container needs to be as wide as its scrollable content, not clipped to the viewport).

2. **Gap between service pack types removed** — Line 491 uses `space-y-4` on the parent, but the cards themselves have `margin: '0 -0px'` (line 532) which is a no-op. The `overflow-visible` change (line 526) may be causing visual overlap between adjacent cards due to shadows bleeding into each other. The gap needs to be more pronounced.

## Plan

### File: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

**Fix 1 — White container wraps all tiers (the scrollable row extends the card):**

The current approach has the white card at viewport width with an internal scrollable row. This means the blue header and white background stop at the card edge while tier cards scroll underneath.

The fix: Keep `overflow-hidden` on the outer card (to maintain rounded corners and background clipping), but make the **tier scroll row** extend edge-to-edge using negative margins (`-mx-4`) to break out of the card's padding, with `px-4` on the first/last items for visual inset. The blue header and white background will naturally cover the full card width, and the scroll row will scroll within it — which is the correct UX (the container stays put, the tier cards scroll inside it).

This matches the user's screenshot — the white background wraps around all options, and you scroll within it.

**Change line 526:** Revert from `overflow-visible` back to `overflow-hidden` — the card container MUST clip to maintain rounded corners and contain the white background. The horizontal scroll works because `overflow-hidden` on the card only clips vertically; the inner `overflow-x-auto` div creates its own scroll context.

Wait — `overflow-hidden` creates a scroll context that clips `overflow-x-auto` children. The real fix: use `overflow-x-clip overflow-y-visible` or simply keep the border-radius via `isolation: isolate` approach. Actually, the simplest fix: keep the card as `overflow-hidden` with `borderRadius: 20px` — the inner `overflow-x-auto` scroll row will still scroll because it's a **nested scroll container**. The parent's `overflow-hidden` clips visual overflow but doesn't prevent a child with `overflow-x-auto` from scrolling internally. This is standard CSS behavior.

**Line 526:** Change back to `overflow-hidden` — this restores the white background wrapping and rounded corners.

**Fix 2 — Increase gap between service pack types:**

**Line 491:** Change `space-y-4` to `space-y-6` (24px gap) to visually separate each service pack type.

### Summary

| Line | Current | Change |
|------|---------|--------|
| 491 | `space-y-4` | `space-y-6` for larger gaps between packs |
| 526 | `overflow-visible` | `overflow-hidden` to restore white container wrapping + rounded corners |

Two line changes, both in `MobileProductColumn.tsx`.

