

# Fix: Counter Duplication, Chat Positioning, and Container Constraints (v3.1.14)

## Problem Analysis

The screenshot reveals three distinct issues:

### Issue 1: Duplicate Counter at Different Scales

**Root Cause:** The backdrop image (`bob-bg-wall.png`) already contains the counter graphic at the bottom. Then `MobileBobCharacter.tsx` renders an **additional** counter overlay image on top:

```text
┌────────────────────────┐
│   Backdrop Image       │
│   (includes counter    │ ← First counter (from backdrop)
│    at bottom)          │
├────────────────────────┤
│ Counter Overlay (z-70) │ ← SECOND counter (rendered separately)
└────────────────────────┘
```

**Solution:** The backdrop image and counter overlay are SEPARATE assets designed to layer together. The issue is that the **backdrop URL is pointing to the wrong asset** - it should be the wall-only image, not the full scene with counter. Alternatively, if using a combined backdrop, the counter overlay should be disabled.

I need to verify the actual asset URLs being loaded from the database.

### Issue 2: Chat Box Floating Too High

**Root Cause:** The v3.1.13 formula is:
```tsx
bottom: `calc(${counterHeightPercent}% + ${bottomOffset}px)`
```

With `counterHeightPercent = 22` and CARFIX's `bottomOffset = 0` (the bottom nav is **outside** the container), this pushes the chat to `22%` from the container bottom.

**The error:** For `ContainedMobileBobLayout`, the container ALREADY excludes the host's header (72px) and bottom nav (72px). The `bottomOffset` from `BobProvider` is meant for `position: fixed` layouts (like `MobileBobLayout`), NOT for contained layouts.

```text
For ContainedMobileBobLayout:
┌─────────────────────────┐ ← Header (72px) - OUTSIDE container
├─────────────────────────┤
│ Bob Container           │
│   height: 100dvh - 144px│
│                         │
│ Counter ends at ~22%    │
│ Chat should be AT 22%   │ ← Correct: bottom: 22%
├─────────────────────────┤
└─────────────────────────┘ ← Bottom Nav (72px) - OUTSIDE container
```

The `bottomOffset` should **NOT** be added for `ContainedChatDrawer` because the host nav is outside the container.

### Issue 3: Chat Box Constrained Width

The chat drawer fills the container properly but appears "narrow" because the container itself may be constrained. This appears correct based on the code - the chat stretches `left: 0, right: 0` within its parent.

---

## Technical Solution

### Fix 1: Remove bottomOffset from ContainedChatDrawer

The `ContainedChatDrawer` is positioned within a container that already accounts for host UI. Remove the `bottomOffset` addition:

```tsx
// packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx

// BEFORE (wrong - adds offset that's already accounted for by container):
bottom: `calc(${counterHeightPercent}% + ${bottomOffset}px)`,

// AFTER (correct - just position above counter):
bottom: `${counterHeightPercent}%`,
```

### Fix 2: Verify Counter Overlay Logic

Check if `counterOverlayUrl` is being passed correctly. If the backdrop already contains the counter, set `counterOverlayUrl` to `undefined` or ensure it's a transparent/separate layer.

The counter overlay in `MobileBobCharacter` at lines 114-129 should only render when there's a distinct counter asset - not when the backdrop already includes it.

### Fix 3: Add Guard Against Double Counter

Add a prop to disable the counter overlay when the backdrop is a combined image:

```tsx
// MobileBobCharacter.tsx
interface MobileBobCharacterProps {
  // ... existing props
  /** Skip counter overlay if backdrop already includes it */
  skipCounterOverlay?: boolean;
}
```

Or verify database configuration is correct - `counter_overlay_url` should only be set when using a backdrop that **doesn't** include the counter.

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx` | Remove `bottomOffset` from bottom calculation |
| `packages/bob-widget/src/components/mobile/ContainedMobileBobLayout.tsx` | Verify counter overlay handling |
| `packages/bob-widget/package.json` | Bump to v3.1.14 |
| `packages/bob-widget/src/version.ts` | Bump version |
| `packages/bob-widget/CHANGELOG.md` | Add entry |

---

## Detailed Changes

### ContainedChatDrawer.tsx

```tsx
// Line 131-132 - Remove bottomOffset for contained mode
style={{
  position: 'absolute',
  bottom: `${counterHeightPercent}%`,  // No bottomOffset - container already sized
  left: 0,
  right: 0,
  // ...
```

### Alternative: Accept a "contained" prop

If we want to preserve bottomOffset for non-contained use cases:

```tsx
interface ContainedChatDrawerProps {
  // ...existing
  /** If true, container already excludes host UI - don't add bottomOffset */
  isContained?: boolean;
}

// Usage:
bottom: isContained 
  ? `${counterHeightPercent}%` 
  : `calc(${counterHeightPercent}% + ${bottomOffset}px)`,
```

---

## Expected Result After Fix

```text
┌─────────────────────────┐ ← Header (72px) - OUTSIDE container
├─────────────────────────┤
│ Bob Container           │
│   ┌───────────────────┐ │
│   │ Backdrop (no      │ │
│   │ counter in image) │ │
│   │                   │ │
│   │    Bob character  │ │
│   │                   │ │
│   ├───────────────────┤ │ ← 22% from bottom
│   │ Chat Drawer       │ │ ← Positioned correctly
│   ├───────────────────┤ │
│   │ Counter Overlay   │ │ ← Single counter (z-70)
│   └───────────────────┘ │
├─────────────────────────┤
└─────────────────────────┘ ← Bottom Nav (72px) - OUTSIDE container
```

---

## Version Bump

```markdown
## [3.1.14] - 2026-01-28

### Fixed
- Chat drawer positioning in contained mode no longer adds bottomOffset (container already sized correctly)
- Removed duplicate bottom offset calculation for ContainedChatDrawer
- Verified counter overlay only renders when backdrop doesn't include counter
```

---

## Verification Checklist

1. Navigate to `/ask-bob` route
2. Verify **single** counter image (not duplicated)
3. Verify chat drawer sits just above the counter (at ~22% from container bottom)
4. Verify chat drawer expands correctly when clicked
5. Verify PTT button is fully visible and tappable
6. Test on mobile viewport (375px)
7. Deploy to CARFIX test site to confirm parity

