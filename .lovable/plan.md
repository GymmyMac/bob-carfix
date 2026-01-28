# Fix Plan: Clean Up Background Fills + Full Catalog Display

## ✅ COMPLETED

All changes have been implemented in `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`:

### Changes Made

1. **Removed lazy loading** - All products now display immediately (no `INITIAL_BATCH_SIZE`, `visibleCount`, `IntersectionObserver`)

2. **Removed section wrapper backgrounds** - `<section>` elements are now transparent

3. **PARTSLOT headers are standalone blue pills** - Rounded with shadow, separated from product cards

4. **Removed wrapper padding from product grid** - Cards float independently

5. **Cleaned up loading/empty state backgrounds** - No longer use `glassCard`

### Visual Result

```
┌─────────────────────────────┐
│ PARTSLOT TITLE (blue pill)  │  ← Title has fill ✅
└─────────────────────────────┘

┌─────────────────────────────┐
│ Product Card (glass)        │  ← Card has fill ✅
└─────────────────────────────┘

┌─────────────────────────────┐
│ Product Card (glass)        │
└─────────────────────────────┘
```

Background visible between elements. Clean, minimal UI.
