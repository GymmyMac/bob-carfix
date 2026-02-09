

# Diagnostic-First Fix: Partslot Scroll + Bob Visual Layering

## What We Know (Confirmed Facts)

1. **500 products are received and mapped** -- console logs confirm `[Bob] Products mapped: 500 items` with valid partslotDescriptions (BEARING, BRAKE PADS, SPARK PLUG, etc.)
2. **106 partslot category headers + all product cards exist in the DOM** -- browser extraction confirms every one
3. **Products render visually correct** -- when scrolled to programmatically, they appear perfectly with correct styling
4. **The user cannot reach them via touch** -- scroll events are being intercepted by the chat drawer

## Root Cause: The Layering Paradox

The current z-stack creates an impossible situation:

```text
Layer              Z-Index   Pointer Events   Problem
--------------     -------   --------------   -------
PTT Button         145       auto             OK
Chat Drawer        130       auto (FULL WIDTH) <-- Blocks ALL touch below it
Product Column     75        auto             <-- Above Bob, breaks visual
Counter            70        none             OK (passthrough)
Bob Character      60        none             OK (passthrough)
```

The chat drawer is `position: absolute; bottom: 0; left: 0; right: 0; height: 110px; overflow: visible`. It covers the **full width** of the container at the bottom. Its expand handle extends 24px above. Combined, it creates a ~134px tall touch-intercepting wall across the entire screen width.

When the user swipes up on the product shelf, the touch-start lands on the chat drawer (z-130 is above product column z-75), so the scroll event never reaches the product scroll container. The service packages are visible because they are at the TOP of the scroll container (already in the viewport without scrolling), but the partslot products below them are unreachable.

Raising the product column z-index to 75 fixed scroll interception but broke Bob's visual layering (products now render in front of Bob).

## The Solution: Pointer-Events Passthrough on Chat Drawer Dead Space

The chat drawer has a large "dead space" area -- the glassmorphism background panel between the interactive elements (text input, PTT button, preview text, expand handle). This dead space intercepts touch events that should pass through to the product column.

### Change 1: Product Column z-index back to 65

Restore `zIndex: 65` on the product column. This places it behind Bob (z-60 is wrong -- Bob's wrapper is `pointer-events: none` so this doesn't matter for touch). Actually, Bob's character div is z-60 and the parent wrapper is `pointer-events: none`, so touch events pass through Bob to whatever is below. The product column at z-65 will sit above the parent wrapper level but the character itself at z-60 will render behind the products visually.

Wait -- that's the same problem. Let me reconsider.

The actual z-stack within the `isolation: isolate` container in ContainedMobileBobLayout:
- Bob's outer div: `absolute inset-0 pointer-events-none` with `overflow: visible`
- Inside that: character at `z-[60]`, counter at `z-[70]`
- Product column: sibling div at `zIndex: 75`
- Chat drawer: sibling div at `zIndex: 130`

Because Bob's outer wrapper is `pointer-events: none`, touch passes through to the product column regardless of z-index. The visual stacking is what z-index controls. Currently z-75 > z-60, so products visually cover Bob.

**Fix**: Set product column back to `zIndex: 55` (below Bob at z-60 and counter at z-70). Bob renders visually in front. Touch still reaches the product column because Bob's wrapper is `pointer-events: none`.

### Change 2: Chat Drawer Pointer-Events Passthrough

The real scroll blocker is the chat drawer at z-130 covering the full screen width. Fix: set `pointerEvents: 'none'` on the chat drawer's outer div, then re-enable `pointerEvents: 'auto'` on each interactive child:
- The expand/collapse handle button
- The collapsed preview text area
- The expanded chat history area
- The input area (text input + PTT button)

This makes the chat drawer's glass background transparent to touch, while keeping all interactive elements (typing, PTT, expand) fully functional.

### Change 3: Keep existing touch optimization

Keep `touchAction: 'pan-y'`, `overscrollBehavior: 'contain'`, and `WebkitOverflowScrolling: 'touch'` on the product column.

## Files to Modify

| File | Change |
|------|--------|
| `MobileProductColumn.tsx` | `zIndex: 75` changed to `zIndex: 55` |
| `ContainedChatDrawer.tsx` | `pointerEvents: 'none'` on outer wrapper, `pointerEvents: 'auto'` on interactive children |

## Updated Z-Layer Stack After Fix

```text
Layer              Z-Index   Pointer Events   Visual Order
--------------     -------   --------------   ------------
PTT Button         145       auto             Top (always clickable)
Chat Drawer BG     130       none (NEW!)      Glass visible, touch passes through
Chat Interactive   130       auto (children)  Input, PTT, handle remain tappable
Counter            70        none             Visually above products
Bob Character      60        none (parent)    Visually above products
Product Column     55        auto             Scrollable, visually behind Bob
Backdrop           0         none             Background
```

Touch flow for scrolling: User swipes on product area -> passes through chat drawer glass (pointer-events: none) -> passes through Bob wrapper (pointer-events: none) -> reaches product column (pointer-events: auto, z-55) -> scroll works.

## What This Preserves

- Bob stays visually IN FRONT of the product shelf (the shop counter experience)
- Counter overlay stays visually above products
- Service packages remain full-size at the top of the shelf
- All chat drawer interactive elements (PTT, text input, expand handle) remain fully functional
- No changes to product data flow, mapping, or rendering logic

## Verification Steps

1. Navigate to /ask-bob, enter REGO AMA993
2. Confirm Bob appears IN FRONT of the product cards (shop counter experience intact)
3. Swipe up on the product shelf area
4. Confirm scrolling works past the 6 service packages
5. Confirm partslot category headers (BEARING, BRAKE PADS, etc.) become visible
6. Confirm chat drawer input, PTT button, and expand handle still work
7. Confirm expand/collapse of chat drawer still functions
