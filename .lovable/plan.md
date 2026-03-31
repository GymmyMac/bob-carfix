

# Fix Horizontal Scroll for Product Rows

## Root Cause

The horizontal scroll on product rows is **completely blocked** by two things on the outer shelf container (line 291):

1. **`overflow-x-hidden`** — clips any horizontal scroll within child elements
2. **`touchAction: 'pan-y'`** (line 313) — tells the browser to only allow vertical touch gestures, blocking all horizontal swipe

The tier cards for service packages happen to work (or partially work) because they sit inside their own `overflow-x-auto` container, but the parent `overflow-x-hidden` + `pan-y` still fights them.

## The Fix

### File: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

**Change 1 — Outer container (line 291):**
- Remove `overflow-x-hidden` from the className — change to just `overflow-y-auto`
- Change `touchAction: 'pan-y'` to `touchAction: 'auto'` so the browser can detect both horizontal and vertical gestures

**Change 2 — Each horizontal scroll row (line 968-974):**
- Add `touchAction: 'pan-x'` on the horizontal scroll rows so when a user touches inside a product row, the browser prioritizes horizontal scrolling
- Add the CSS class `product-scroll-row` to the div so the webkit scrollbar-hide rule actually applies (currently the class is defined in a `<style>` tag but never applied to the element)

**Change 3 — Service package tier row (line 600-606):**
- Same treatment: add `touchAction: 'pan-x'` for consistent swipe behavior

## Summary

| Line | Current | Fix |
|------|---------|-----|
| 291 | `overflow-y-auto overflow-x-hidden` | `overflow-y-auto` (remove x-hidden) |
| 313 | `touchAction: 'pan-y'` | `touchAction: 'auto'` |
| 968 | No touchAction on product row | Add `touchAction: 'pan-x'` |
| 601 | No touchAction on tier row | Add `touchAction: 'pan-x'` |
| 968 | Missing class `product-scroll-row` | Add the class so scrollbar-hide CSS applies |

This is a 3-line fix at its core. Each horizontal row will scroll independently — swiping one row won't affect the row above or below.

