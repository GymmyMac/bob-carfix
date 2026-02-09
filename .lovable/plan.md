

# Fix: Partslot Products Hidden by `overflow-hidden` on Section Wrapper

## Root Cause

Each partslot category section (BEARING, BRAKE PADS, AIR CONDITIONING COMPRESSOR, etc.) is wrapped in a `<section>` element at line 842 of `MobileProductColumn.tsx` with `className="transition-all duration-300 overflow-hidden"`.

The `overflow-hidden` CSS class clips all content inside each section. Because these sections contain absolutely-positioned or dynamically-sized product cards, the hidden overflow prevents them from being visible.

You confirmed this directly: removing `overflow-hidden` in DevTools makes all products appear.

## Fix

**File**: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`, line 842

```
// BEFORE
className="transition-all duration-300 overflow-hidden"

// AFTER
className="transition-all duration-300"
```

One line change. No other files affected.

## Why `overflow-hidden` Was There

It was likely added for a collapsible/accordion animation (expand/collapse partslot groups). If that feature is not currently used, the class just silently clips content. The `transition-all duration-300` suggests it was meant to animate height changes, but without an explicit height being set, the overflow-hidden simply hides any content that overflows.

## Verification Steps

1. Navigate to /ask-bob, enter REGO AMA993
2. Service packages appear at top of shelf
3. Scroll down past service packages
4. Partslot category headers (BEARING, BRAKE PADS, AIR CONDITIONING COMPRESSOR, etc.) are visible with product cards underneath each one
5. Bob remains visually in front of the products
6. Chat drawer remains functional

