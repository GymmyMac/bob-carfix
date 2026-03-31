

# Fix: Independent Horizontal Scrolling for Service Pack and Product Rows

## Problem

Horizontal scrolling on service pack tier rows and product rows is blocked by two ancestor containers:

1. **`MobileBobLayoutCore.tsx` (line 180)**: `className="absolute inset-0 overflow-hidden"` — clips all overflow from descendants, killing horizontal scroll.
2. **`MobileBobLayoutCore.tsx` (line 184)**: `touchAction: 'manipulation'` — collapses panning to a single axis per gesture, which combined with the vertical-scrolling shelf, prevents horizontal swipe from being recognized on inner elements.

The product shelf itself (`MobileProductColumn.tsx` line 291) now correctly uses `touchAction: 'auto'`, and each row uses `touchAction: 'pan-x'` — but the grandparent container above kills both via clipping and gesture restriction.

## Fix Plan

### File 1: `packages/bob-widget/src/components/mobile/MobileBobLayoutCore.tsx`

**Line 180** — Change `overflow-hidden` to `overflow-clip` (or remove it). `overflow-clip` prevents visual bleed but does NOT create a scroll container, so it won't intercept touch gestures from descendants. This is the key difference: `overflow-hidden` creates a scroll context that eats horizontal swipes.

**Line 184** — Change `touchAction: 'manipulation'` to `touchAction: 'auto'`. The `manipulation` value disables double-tap zoom but also prevents the browser from recognizing horizontal pan gestures on nested scroll containers.

### File 2: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

**Tier card row (line 601)** — Ensure `overscrollBehavior: 'contain'` is set on each horizontal scroll row to prevent scroll-chaining to the vertical shelf.

**Product card row (line 970)** — Same treatment: add `overscrollBehavior: 'contain'`.

**Card widths** — Adjust so roughly 1.5 cards are visible (half card peek):
- Service pack tiers: already ~48% for 2 tiers, keep as-is since they already have good sizing
- Product cards: change mobile width from `75%` to `65%` so ~1.5 cards are visible, making the "half card" peek obvious

**Row height** — Add `max-height` or fixed height to the horizontal rows so they stay consistent and don't grow with content.

### File 3: `packages/bob-widget/src/styles/widget-reset.css`

Add CSS rule for `.product-scroll-row::-webkit-scrollbar { display: none; }` scoped under `.bob-widget-root` so it persists regardless of inline `<style>` tag rendering order. Remove the inline `<style>` tag from `MobileProductColumn.tsx` line 978.

## Summary

| File | Line(s) | Change |
|------|---------|--------|
| `MobileBobLayoutCore.tsx` | 180 | `overflow-hidden` → `overflow-clip` |
| `MobileBobLayoutCore.tsx` | 184 | `touchAction: 'manipulation'` → `touchAction: 'auto'` |
| `MobileProductColumn.tsx` | 601-607 | Add `overscrollBehavior: 'contain'` to tier row |
| `MobileProductColumn.tsx` | 970-976 | Add `overscrollBehavior: 'contain'` to product row |
| `MobileProductColumn.tsx` | 988 | Mobile card width `75%` → `65%` for half-card peek |
| `MobileProductColumn.tsx` | 978 | Remove inline `<style>` tag |
| `widget-reset.css` | ~283 | Add `.bob-widget-root .product-scroll-row` scrollbar hide rule |

