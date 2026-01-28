
# Fix Plan: Clean Up Background Fills + Full Catalog Display

## Summary

Remove redundant background fills from the parts column so only two elements have backgrounds:
1. **PARTSLOT title box** (section header) - Blue solid background ✅ KEEP
2. **Product cards** - Individual card backgrounds ✅ KEEP

All container/wrapper backgrounds will be removed for a cleaner visual hierarchy.

---

## Background Fills to Remove

| Element | Current Style | New Style |
|---------|--------------|-----------|
| Product section wrapper (`<section>`) | `glassCard` with `rgba(20, 30, 50, 0.75)` | `transparent` |
| Loading state container | `glassCard` | `transparent` with subtle text |
| Empty state container | `glassCard` + orange tint | `transparent` with subtle text |

---

## Implementation Details

### File: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

### Change 1: Remove Section Wrapper Background (lines 758-769)

The `<section>` element currently has a dark glass background. We'll remove it so only the header and product cards are colored.

**Before (lines 758-768):**
```typescript
<section 
  key={name}
  ref={(el) => { groupRefs.current[name] = el; }}
  className="transition-all duration-300"
  style={{
    ...(isHighlighted ? glassCardPremium : glassCard),
    background: isHighlighted 
      ? 'linear-gradient(135deg, rgba(0, 82, 164, 0.85) 0%, rgba(0, 51, 102, 0.9) 100%)'
      : 'rgba(20, 30, 50, 0.75)',
  }}
>
```

**After:**
```typescript
<section 
  key={name}
  ref={(el) => { groupRefs.current[name] = el; }}
  className="transition-all duration-300 overflow-hidden"
  style={{
    background: 'transparent',
    borderRadius: '24px',
  }}
>
```

### Change 2: Update Section Header to Stand Alone (lines 771-813)

Keep the solid blue header for PARTSLOT title, but add bottom border-radius since it's no longer inside a container.

**Before:**
```typescript
<div 
  className="px-3 py-2.5 flex items-center justify-between"
  style={{
    background: isHighlighted 
      ? 'rgba(0, 102, 204, 0.8)'
      : 'rgba(0, 51, 102, 0.7)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  }}
>
```

**After:**
```typescript
<div 
  className="px-3 py-2.5 flex items-center justify-between"
  style={{
    background: isHighlighted 
      ? 'rgba(0, 102, 204, 0.95)'
      : 'rgba(0, 51, 102, 0.9)',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    marginBottom: '8px',
  }}
>
```

### Change 3: Update Products Grid Container (line 816)

Remove the `p-3` padding wrapper since products will now float independently.

**Before:**
```typescript
<div className="p-3 flex flex-col gap-3">
```

**After:**
```typescript
<div className="flex flex-col gap-3">
```

### Change 4: Clean Up Loading State (lines 416-432)

**Before:**
```typescript
<div 
  className="p-5"
  style={{
    ...glassCard,
  }}
>
```

**After:**
```typescript
<div className="p-5">
```

### Change 5: Clean Up Empty State (lines 436-457)

**Before:**
```typescript
<div 
  className="p-5"
  style={{
    ...glassCard,
    background: 'rgba(255, 149, 0, 0.15)',
  }}
>
```

**After:**
```typescript
<div className="p-5">
```

---

## Combined: Full Catalog Display (From Previous Plan)

Also implementing the lazy loading removal:

### Change 6: Remove Lazy Loading (lines 244-248, 254-274, 277, 836-846)

**Delete these:**
- `INITIAL_BATCH_SIZE`, `LOAD_MORE_SIZE` constants
- `visibleCount` state
- `loadMoreRef` ref
- Reset visible count `useEffect`
- IntersectionObserver `useEffect`
- Lazy loading sentinel UI

**Update groupedProducts to use all products:**
```typescript
const groupedProducts = useMemo(() => {
  const groups: Record<string, Product[]> = {};
  products.forEach(product => {
    const key = product.partslotDescription || 'Other Parts';
    if (!groups[key]) groups[key] = [];
    groups[key].push(product);
  });
  const sortedGroupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
  return sortedGroupNames.map(name => ({ name, products: groups[name] }));
}, [products]);
```

---

## Visual Result

**Before:**
```
┌─────────────────────────────┐
│ ███ DARK GLASS SECTION ███ │  ← Section wrapper has fill
│ ┌─────────────────────────┐ │
│ │ PARTSLOT TITLE (blue)   │ │  ← Title has fill ✅
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Product Card (glass)    │ │  ← Card has fill ✅
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Product Card (glass)    │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**After:**
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

Clean, minimal - background visible between elements.

---

## Files to Modify

1. **`packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`**
   - Remove section wrapper background fills
   - Make PARTSLOT header a standalone rounded pill
   - Remove padding wrapper from products grid
   - Remove lazy loading (show full catalog)
   - Clean up loading/empty state backgrounds

---

## Verification Checklist

- [ ] Section wrappers are transparent (no dark glass fill)
- [ ] PARTSLOT title boxes have blue pill background
- [ ] Individual product cards retain their glass styling
- [ ] Background/scene is visible between sections
- [ ] All products appear immediately (no lazy loading)
- [ ] All part categories are complete from load
- [ ] Scroll performance remains smooth
