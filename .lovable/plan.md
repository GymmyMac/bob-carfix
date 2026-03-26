

## Confirming: Does the Plan Preserve Touch Interactions?

**Yes — both concerns are already handled by the scoped approach.**

### 1. Product shelf items remain tappable

`user-select: none` only suppresses **text/image selection** (the blue highlight on long-press). It does **not** block `click`, `touchstart`, `touchend`, or `pointerdown` events. All product tiles, service package cards, variant selection cards, and "Add to Cart" buttons will continue to fire their `onClick` / `onProductClick` / `onPackageSelect` handlers exactly as before.

### 2. Host page elements remain selectable

Every CSS rule is scoped to `.bob-widget-root`:

```css
.bob-widget-root {
  -webkit-user-select: none;
  user-select: none;
}
```

Elements **outside** `.bob-widget-root` (CarFix navigation, page content, forms) are completely unaffected. The widget is rendered inside its own isolated container, so host-page selectability is untouched.

### 3. Chat input still allows text editing

The plan explicitly re-enables selection on inputs:

```css
.bob-widget-root input,
.bob-widget-root textarea {
  -webkit-user-select: text !important;
  user-select: text !important;
}
```

---

### Summary

| Interaction | Affected? |
|---|---|
| Tap product tiles / service packages | No — taps still work |
| Long-press PTT button | Fixed — no more image selection |
| Type in chat input | No — text selection re-enabled on inputs |
| Select text on host page | No — rules scoped to `.bob-widget-root` only |

**The plan is safe to implement as-is. No modifications needed.**

