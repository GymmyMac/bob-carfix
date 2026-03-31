

# Why Horizontal Scrolling Is Broken — Root Cause Analysis

## Problem 1: `overflow-hidden` on the service package card (LINE 526)

Each service package is wrapped in a `<div className="overflow-hidden">` with `borderRadius: '20px'`. This is the **primary blocker** — it clips ALL overflow from children, which means the tier card row's `overflow-x-auto` scrollable area is clipped to the card's visible bounds. The browser creates a scroll container but the content is visually and physically clipped by the parent.

**Why it's there:** `overflow-hidden` was added to make `borderRadius: '20px'` work cleanly (rounded corners require overflow clipping). But it kills horizontal scroll on every child.

## Problem 2: Tier card widths don't exceed the container

The tier cards use percentage widths (line 621): `width: '48%'` for 2 tiers, `'38%'` for 3, `'140px'` for 4+. When there are only 2-3 tiers, these percentages fit inside the container width — there's **nothing to scroll to** because the total content width doesn't exceed the container. The `overflow-x-auto` only activates when content exceeds the scrollable area.

## Problem 3: The white background stops at the card edge

The user expects the white background of each service pack section to extend to the screen edge. Currently, the outer scroll container has `paddingRight: '16px'` and `paddingLeft: '16px'` (lines 305-306), plus each card has its own internal padding (`px-4`). This means the white card sits inset from both edges, with a gap on each side.

## The Fix

### File: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

**Fix 1 — Remove `overflow-hidden` from service package card (line 526):**
Change to `overflow-visible` or remove the class. To keep rounded corners on the header, apply `borderRadius` and `overflow-hidden` only to the header div (line 535-539), not the whole card wrapper.

**Fix 2 — Force tier cards to have fixed pixel widths that cause overflow:**
Instead of percentage widths that fit inside the container, use fixed widths like `min-width: 65%` (matching product cards) so that 2+ tiers always overflow and become scrollable. This gives the half-card peek effect.

**Fix 3 — Extend service pack cards edge-to-edge:**
Remove or reduce the outer container's horizontal padding (`paddingRight`/`paddingLeft` on line 305-306) from `16px` to `0`, and instead apply horizontal padding only to elements that need inset (like the shelf header). The service package white cards should stretch to the full column width, giving the edge-to-edge white background the user expects.

Alternatively, apply negative margins (`-mx-4`) on each service package card to break out of the parent padding, with the card's own internal padding providing the content inset.

**Fix 4 — Same treatment for product category rows (line 970):**
Product rows also sit inside the padded container. Apply negative margins so the scrollable row extends edge-to-edge, with padding on the first card to maintain visual inset.

### Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| Can't scroll tier cards | `overflow-hidden` on parent card div | Remove `overflow-hidden`, scope it to header only |
| Nothing to scroll (2-3 tiers) | Percentage widths fit inside container | Use `min-width: 65%` fixed sizing |
| White background doesn't reach edge | 16px padding on outer container | Remove outer padding, use per-element padding or negative margins |
| Product rows same issue | Same padding constraint | Same negative margin treatment |

