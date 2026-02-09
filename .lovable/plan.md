

# Fix: Partslot Products Unreachable via Touch Scroll

## Verified Finding: Same Z-Index Confirmed

Both service packages and partslot products are **sibling elements inside the same scroll container**. The scroll container div has `zIndex: 65`. There is NO separate z-index on service packages vs partslot products -- they share exactly the same stacking context. The products exist in the DOM (97 categories, 506 tiles) and render visually when scrolled to programmatically.

## Root Cause: Touch Event Interception

The product column scroll container sits at `zIndex: 65`, but two higher-z elements overlap it and steal touch events:

1. **ContainedChatDrawer** -- `zIndex: 130` (zIndexBase 100 + 30), covers full width, bottom 110px, `position: absolute; bottom: 0; left: 0; right: 0`
2. **Counter Overlay** -- `z-70`, covers bottom 22% of container (~154px), BUT already has `pointerEvents: 'none'` so should not block

The chat drawer at z-130 covers the bottom ~110px. The product column's `bottom` is set to `calc(100px + ...)`, meaning its lowest visible scroll area sits right at the chat drawer boundary. When the user tries to swipe/scroll in the lower portion of the screen, the chat drawer intercepts the touch.

More critically: on many mobile browsers, the touch target detection uses the **topmost interactive element at the initial touch point**. If the user starts a swipe gesture anywhere the chat drawer overlaps (even partially, including its overflow-visible handle that extends 24px above), the scroll event goes to the chat drawer instead of the product column.

## Solution: Raise Product Column Above Chat Drawer Boundary

### File: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

**Change 1 -- Raise z-index to 75**

The product column needs to sit above the counter overlay (z-70) to ensure it receives touch events in all visible areas. Change line 360:

```
// BEFORE
zIndex: 65,

// AFTER  
zIndex: 75,
```

This places the product column at z-75, above the counter (z-70) and below the chat drawer (z-130). The chat drawer still receives events in its 110px zone, but the product column receives events everywhere above that.

**Change 2 -- Add pointer-events control to ensure scroll passthrough**

Add `pointerEvents: 'auto'` explicitly on the product column to guarantee it captures touch events in its visible area:

```typescript
pointerEvents: 'auto',
```

**Change 3 -- Add diagnostic data attributes for verification**

Add `data-testid` markers so the user can verify partslot products are on screen:

On each partslot section header (the blue pill), add:
```
data-testid="partslot-header"
data-partslot-name={name}
```

On each product tile wrapper, add:
```
data-testid="partslot-product"
```

### File: `packages/bob-widget/src/components/mobile/ContainedMobileBobLayout.tsx`

No changes needed. The `isolation: isolate` fix already creates the correct stacking context.

### File: `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx`

No changes needed. The chat drawer correctly uses `zIndexBase + 30` (130) which is above the product column.

## Updated Z-Layer Stack After Fix

```text
Layer      Z-Index   Element                    Pointer Events
-------    -------   -------------------------  --------------
Chat PTT   145       PTT button                 auto
Chat UI    130       ContainedChatDrawer         auto (bottom 110px only)
Product    75        MobileProductColumn         auto (scrollable)
Counter    70        Counter overlay image       none (passthrough)
Bob        60        MobileBobCharacter          none (passthrough)
Backdrop   0         Background image            none
```

## Verification Steps

After implementation:

1. Navigate to /ask-bob on mobile
2. Enter a vehicle REGO (e.g., AMA993)
3. Wait for products to load (506 items in header)
4. Swipe up on the product shelf area -- scroll should move smoothly past service packages
5. Continue scrolling -- partslot category headers (BEARING, BRAKE PADS, etc.) should appear
6. Confirm the diagnostic data attributes are present in DOM inspector
7. Remove diagnostic markers after verification if desired

## What This Does NOT Change

- No layout changes to service packages (they remain full-size, expanded)
- No changes to the product data flow or mapping
- No changes to the chat drawer positioning
- No changes to Bob character or counter overlay
- Service packages remain first, partslot products below (existing sort order preserved)

