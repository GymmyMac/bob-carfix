

# Fix: Wasted Top Space + Partslot Products Not Reachable via Touch Scroll

## Issues Identified

### Issue 1: Wasted Space at Top of Page
The product shelf has `top: calc(56px + env(safe-area-inset-top, 4px))` when a vehicle is identified. The CARFIX Demo nav bar already occupies space, and this additional 56px offset creates a visible gap between the nav bar and the first product shelf header ("TOYOTA RAV4 506 items").

### Issue 2: Partslot Products Not Scrollable on Mobile
**Confirmed via browser automation**: 88 partslot category headers and 298 product cards exist in the DOM. The scroll container has scrollHeight: 13,935px and clientHeight: 516px. When scrolled programmatically, partslot products (BEARING, BRAKE PADS, SPARK PLUG, etc.) render correctly. The user simply cannot reach them via touch/swipe.

**Root cause**: The parent container (`ContainedMobileBobLayout`) has `overflow: hidden` which, combined with `touchAction: 'manipulation'`, prevents some mobile browsers from correctly routing touch-scroll events to the absolutely-positioned product column. The `pointerEvents: 'none'` fix on the chat drawer was necessary but not sufficient -- the parent container itself is intercepting touch events before they reach the scroll child.

### Issue 3: "Sample partslotDescription" in Console Logs
This is a misleading debug log label in `Bob.tsx` line 123. There is no sample data -- it logs the first 10 real `partslotDescription` values from the API response. The label should say "First" not "Sample" for a production system.

## Solution

### File 1: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

**Change: Reduce top offset from 56px to 8px when vehicle is present**

The vehicle name is already shown in the sticky shelf header ("TOYOTA RAV4 506 items"), so the 56px gap reserved for a vehicle context bar (which was removed) is no longer needed.

```
// BEFORE
const topOffset = viewportSize === 'mobile' 
  ? `calc(${hasVehicle ? '56px' : '8px'} + env(safe-area-inset-top, 4px))`
  : '6px';

// AFTER
const topOffset = viewportSize === 'mobile' 
  ? `calc(8px + env(safe-area-inset-top, 4px))`
  : '6px';
```

This eliminates the wasted space at the top.

### File 2: `packages/bob-widget/src/components/mobile/ContainedMobileBobLayout.tsx`

**Change: Replace `overflow-hidden` with `overflow-clip` on the parent container**

`overflow: hidden` creates a scroll container that can intercept touch events on some mobile browsers. `overflow: clip` provides the same visual clipping without creating a scroll container, allowing touch events to flow through to the child product scroll container.

```
// BEFORE
className="absolute inset-0 overflow-hidden"

// AFTER  
className="absolute inset-0"
style={{
  ...existing styles...,
  overflow: 'clip',
}}
```

Also remove `touchAction: 'manipulation'` from the parent -- the product column already has its own `touchAction: 'pan-y'` which is more specific and correct. The parent's `manipulation` can conflict.

### File 3: `packages/bob-widget/src/components/Bob.tsx`

**Change: Rename misleading debug log**

```
// BEFORE
console.log('[Bob] Sample partslotDescriptions:', 

// AFTER
console.log('[Bob] First partslotDescriptions:', 
```

## Updated Layout After Fix

```text
Top of screen
  |-- 8px + safe-area (was 56px + safe-area)
  |-- Sticky shelf header: "TOYOTA RAV4  506 items"
  |-- Service packages (6 cards)
  |-- Partslot categories (88 headers, 298 products)
  |-- 8px bottom padding
  |-- 100px gap for chat drawer
Bottom of screen
```

## Z-Layer Stack (unchanged from last fix)

```text
Layer              Z-Index   Pointer Events
--------------     -------   --------------
Chat Drawer BG     130       none (passthrough)
Chat Interactive   130       auto (children only)
Counter            70        none (passthrough)
Bob Character      60        none (parent wrapper)
Product Column     55        auto (scrollable)
Backdrop           0         none
```

## What This Preserves

- Bob stays visually IN FRONT of the product shelf (shop counter experience intact)
- Service packages remain full-size at the top
- Chat drawer remains fully interactive (input, PTT, expand/collapse)
- No changes to product data flow or mapping

## Verification Steps

1. Navigate to /ask-bob on mobile, enter REGO AMA993
2. Confirm the product shelf header sits close to the top (no wasted 56px gap)
3. Swipe up on the product shelf
4. Confirm you can scroll past all 6 service packages
5. Confirm partslot category headers (BEARING, BRAKE PADS, etc.) appear and are scrollable
6. Confirm Bob appears visually in front of product cards
7. Confirm chat drawer input and PTT button remain functional

