

# Add Desktop Scroll Controls for Product Rows

## Problem

On desktop, product rows use `overflow-x-auto` with hidden scrollbars (via `.product-scroll-row` CSS). With 17 products at `32%` width, the row overflows but there's no visible way to scroll — no scrollbar, no arrow buttons. Mobile uses touch swiping which works, but desktop needs visible controls.

## Plan

### File 1: `packages/bob-widget/src/styles/widget-reset.css`

Show a thin styled scrollbar on desktop for `.product-scroll-row` instead of hiding it. Use a media query:

```css
/* Show thin scrollbar on desktop for product rows */
@media (min-width: 1024px) {
  .bob-widget-root .product-scroll-row::-webkit-scrollbar {
    display: block;
    height: 6px;
  }
  .bob-widget-root .product-scroll-row::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  .bob-widget-root .product-scroll-row::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.4);
    border-radius: 3px;
  }
  .bob-widget-root .product-scroll-row::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.6);
  }
  .bob-widget-root .product-scroll-row {
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.4) rgba(255,255,255,0.1);
  }
}
```

Override the existing hide rules by wrapping the hide rules in a `max-width: 1023px` media query (mobile/tablet only).

### File 2: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

No changes needed — the `overflow-x-auto` is already set. The CSS change alone will reveal the scrollbar on desktop.

### Summary

| File | Change |
|------|--------|
| `widget-reset.css` | Wrap scrollbar-hide in `max-width: 1023px`, add styled thin scrollbar for `min-width: 1024px` |

Single file change. Desktop gets a visible thin scrollbar; mobile keeps hidden scrollbar with touch swiping.

