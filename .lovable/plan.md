
# Fix Plan: Chat Drawer Height, Bob Position, and Product Column Bottom (v3.1.16)

## Issues Identified from Screenshot

| # | Issue | Root Cause | Severity |
|---|-------|------------|----------|
| 1 | "Listening..." text pushes chat drawer behind bottom nav | Chat drawer collapsed height (90px) doesn't account for the "Listening..." indicator adding ~24px | 🔴 Critical |
| 2 | Bob pushed too far left | `partialLeftPosition: -55` on mobile is too aggressive - Bob is 55% off-screen | 🔴 Critical |
| 3 | Product column doesn't extend below counter | Mobile bottom is `180px` which doesn't extend to the actual bottom | 🟡 Medium |

---

## Technical Analysis

### Issue 1: Chat Drawer "Listening..." Pushes Content Off-Screen

**Current Code (`ContainedChatDrawer.tsx` lines 230-235):**
```tsx
{isListening && (
  <div style={{ marginBottom: '8px', fontSize: '12px', ... }}>
    <span ... />
    Listening...
  </div>
)}
```

This adds ~24px of content when the PTT button is held. Combined with the collapsed height of `90px`, the total drawer height becomes ~114px, but the container only allocates 90px, causing content to overflow downward behind the host's bottom nav.

**Solution:** Increase collapsed height to account for "Listening..." state OR make the listening indicator NOT affect layout (position absolute).

### Issue 2: Bob Too Far Left

**Current Code (`usePositionFactors.ts` line 41):**
```tsx
case 'mobile':
  return {
    partialLeftPosition: -55,  // Bob 55% off-screen left when products show
```

This pushes Bob so far left that very little of him is visible. The screenshot shows Bob's head barely visible at the left edge.

**Solution:** Reduce `partialLeftPosition` from `-55` to `-30` or `-35` so more of Bob remains visible when products are showing.

### Issue 3: Product Column Bottom Cutoff

**Current Code (`MobileProductColumn.tsx` line 361-362):**
```tsx
bottom: viewportSize === 'mobile' 
  ? 'calc(180px + env(safe-area-inset-bottom, 0px))' 
```

This 180px accounts for:
- Counter overlay: 12-22% of container
- Chat drawer collapsed: 90px
- Host bottom nav: Outside container (not relevant for contained mode)

But the chat drawer at `bottom: 0` + collapsed height 90px means product column should stop at ~90-100px from container bottom, not 180px.

**Solution:** Reduce mobile bottom offset from `180px` to `100px` so products extend lower.

---

## Implementation Plan

### File 1: `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx`

**Option A (Recommended): Make "Listening..." indicator position absolute**
```tsx
// Lines 230-235: Make listening indicator not affect layout
{isListening && (
  <div style={{ 
    position: 'absolute',
    top: '4px',
    left: '12px',
    marginBottom: '0', 
    fontSize: '12px', 
    color: 'rgba(255,255,255,0.7)', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px',
    zIndex: 10
  }}>
    <span style={{ ... }} />
    Listening...
  </div>
)}
```

**Option B: Increase collapsed height to 120px**
```tsx
height: isExpanded ? '55%' : '120px',
```

### File 2: `packages/bob-widget/src/hooks/usePositionFactors.ts`

**Update mobile `partialLeftPosition` from `-55` to `-30`:**
```tsx
case 'mobile':
  return {
    bobOffset: 1.0,
    productWidth: 1.0,
    uiScale: 1.0,
    partialLeftPosition: -30,  // Reduced from -55 to keep more of Bob visible
    hiddenPosition: -100,
  };
```

### File 3: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

**Update mobile bottom offset from `180px` to `100px`:**
```tsx
bottom: viewportSize === 'mobile' 
  ? 'calc(100px + env(safe-area-inset-bottom, 0px))'  // Reduced from 180px
  : '52px',
```

### File 4: Version files

Bump to **v3.1.16**:
- `packages/bob-widget/package.json`
- `packages/bob-widget/src/version.ts`
- `packages/bob-widget/CHANGELOG.md`

---

## Visual Comparison

### Before:
```text
┌───────────────────────────────┐
│ Header                        │
├───────────────────────────────┤
│ Bob [barely visible edge]     │
│         ┌─────────────────────┤
│         │ Products            │
│         │ (cut off at 180px)  │
│         └─────────────────────┤
│ ┌─────────────────────────────┤
│ │ Chat (90px) + Listening     │ ← Overflows
│ └─────────────────────────────┤
├───────────────────────────────┤
│ Bottom Nav (72px)             │ ← Chat hidden behind this
└───────────────────────────────┘
```

### After:
```text
┌───────────────────────────────┐
│ Header                        │
├───────────────────────────────┤
│ Bob [~70% visible]            │
│         ┌─────────────────────┤
│         │ Products            │
│         │ (extends to ~100px) │
│         │                     │
│         └─────────────────────┤
│ ┌─────────────────────────────┤
│ │ Chat [Listening overlay]    │ ← Contained properly
│ └─────────────────────────────┤
├───────────────────────────────┤
│ Bottom Nav (72px)             │ ← Clear separation
└───────────────────────────────┘
```

---

## Changelog Entry

```markdown
## [3.1.16] - 2026-01-28

### Fixed
- 🎤 **Listening Indicator**: Made "Listening..." overlay position: absolute so it doesn't push chat drawer content down
- 🧍 **Bob Positioning**: Reduced mobile `partialLeftPosition` from -55 to -30 to keep more of Bob visible when products show
- 📦 **Product Column Height**: Reduced mobile bottom offset from 180px to 100px so products extend closer to chat drawer
```

---

## Verification Checklist

1. Navigate to `/ask-bob`
2. Confirm Bob is ~70% visible when products are showing (not pushed too far left)
3. Hold PTT button - confirm "Listening..." appears WITHOUT pushing drawer behind bottom nav
4. Confirm product column extends lower on the page (closer to the chat drawer)
5. Scroll products to bottom - confirm last items are accessible
6. Test on mobile viewport (375px)
