

# Fix: Bob Widget Height Gap on Mobile (v3.2.20)

## The Gap (from CARFIX screenshot)

The uploaded screenshot shows the issue clearly: after Bob starts talking and products are displayed, there is a visible empty space between the chat drawer's bottom edge and the CARFIX bottom navigation bar (Home / Garage / Parts / Cart). Once it appears, it persists.

## Root Cause

The `ContainedMobileBobLayout` root div uses `absolute inset-0` — relying on CSS percentage inheritance from the host container. On mobile Safari, `dvh` recalculations during URL bar show/hide or keyboard transitions cause the parent's computed height to fluctuate. The chat drawer is anchored `bottom: 0` within this container, but when the container's height shrinks (stale `dvh` value), the drawer detaches from the visual bottom of the screen, creating the gap.

## Solution

### 1. New hook: `useContainerHeight.ts`
- Uses `ResizeObserver` on the widget's root element to get actual pixel height
- Falls back to `100%` if `ResizeObserver` unavailable
- Provides a stable, concrete height value immune to `dvh` fluctuations

### 2. Update `ContainedMobileBobLayout.tsx`
- Attach a ref to the root `div`
- Use `useContainerHeight` to get observed pixel height
- Set `height: ${observedHeight}px` instead of relying on `inset-0` alone
- Add `will-change: height` for smooth transitions

### 3. Stabilize `ContainedChatDrawer.tsx`
- Add `will-change: transform` to prevent GPU layer detachment during height transitions
- Ensure `bottom: 0` is computed against the explicitly-sized parent

### 4. Update `AskBob.tsx` demo page
- Add `ResizeObserver` / `visualViewport` listener as reference implementation
- Set explicit pixel height on the Bob container div
- Serves as documentation for CARFIX production integration

### 5. Version bump to `3.2.20`
- `packages/bob-widget/package.json`
- `packages/bob-widget/src/version.ts`
- `packages/bob-widget/CHANGELOG.md`

## Files

| File | Action |
|------|--------|
| `packages/bob-widget/src/hooks/useContainerHeight.ts` | New — ResizeObserver hook |
| `packages/bob-widget/src/components/mobile/ContainedMobileBobLayout.tsx` | Use observed height on root div |
| `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx` | Add `will-change: transform` |
| `src/pages/AskBob.tsx` | Reference implementation with ResizeObserver |
| `packages/bob-widget/src/version.ts` | Bump to 3.2.20 |
| `packages/bob-widget/package.json` | Bump to 3.2.20 |
| `packages/bob-widget/CHANGELOG.md` | Document fix |

