
# Fix: PTT Long-Press Triggers "Save Image" on Mobile

## Problem

When holding the Push-to-Talk (PTT) button on mobile Safari/Chrome, the browser interprets the long-press as targeting the Bob character image or backdrop image beneath/near the button, triggering the native "Save image" context menu. This completely breaks the voice input flow.

## Root Cause

The PTT button correctly sets `touchAction: 'none'` and `userSelect: 'none'` on itself, but:

1. The Bob character image (`MobileBobCharacter.tsx`) and backdrop image (`MobileBobLayoutCore.tsx`) have **no protection** against the native long-press context menu
2. There is **no** `-webkit-touch-callout: none` anywhere in the widget codebase
3. There is **no** `contextmenu` event prevention on the widget container

## Solution (3 layers of defense)

### Layer 1: CSS on all widget images
Add `-webkit-touch-callout: none` and `user-select: none` to every `<img>` element in the widget's mobile layout. This is the Safari-specific property that controls the long-press callout sheet.

**Files changed:**
- `packages/bob-widget/src/components/mobile/MobileBobCharacter.tsx` -- Bob sprite and counter overlay images
- `packages/bob-widget/src/components/mobile/MobileBobLayoutCore.tsx` -- Backdrop image

### Layer 2: Prevent `contextmenu` event on the widget container
Add an `onContextMenu={(e) => e.preventDefault()}` handler on the outermost widget container. This catches any remaining right-click / long-press context menu attempts across the entire widget surface.

**Files changed:**
- `packages/bob-widget/src/components/mobile/ContainedMobileBobLayout.tsx` -- The primary embedded layout wrapper

### Layer 3: PTT button `touchstart` calls `preventDefault()`
Update the PTT `handlePTTStart` in both chat drawer components to call `e.preventDefault()` on the touch event, stopping the browser from ever propagating the gesture to underlying elements.

**Files changed:**
- `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx`
- `packages/bob-widget/src/components/mobile/MobileChatDrawer.tsx`

## Technical Details

```css
/* Applied to all widget images */
-webkit-touch-callout: none;
user-select: none;
-webkit-user-select: none;
```

```typescript
/* PTT touchstart handler update */
const handlePTTStart = useCallback((e: React.TouchEvent) => {
  e.preventDefault(); // Block browser long-press interpretation
  if (isLoading || pttActiveRef.current) return;
  // ... existing logic
}, [isLoading, startListening]);
```

```typescript
/* Widget container */
<div onContextMenu={(e) => e.preventDefault()}>
```

## Why all 3 layers?

| Layer | Blocks | Browser |
|-------|--------|---------|
| `-webkit-touch-callout: none` | Image callout sheet | Safari |
| `onContextMenu preventDefault` | Context menu fallback | All browsers |
| `touchstart preventDefault` on PTT | Gesture propagation to images below | All browsers |

No single approach covers all browsers and edge cases. The combination ensures zero context menu interference regardless of where the user's finger lands.
