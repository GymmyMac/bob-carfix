# Bob Widget — Shelf System Specification

## Overview
The shelf displays service packages and individual parts for a vehicle. It is the primary product browsing interface in the Bob widget.

## Sections (top to bottom)

1. **ShelfHeader** — Sticky blue pill: vehicle name, item count, loading spinner
2. **VariantSelector** — Vehicle variant cards (only when `pendingVariants` exists)
3. **ServicePackageSection** — One `ServicePackageCard` per package:
   - Blue gradient header (title, estimated time)
   - Description + optional disc/drum toggle (rear brake packages only)
   - Horizontal tier card row (scrollable on all viewports)
   - "Show details" accordion with product list
   - Add-to-cart per tier
4. **PartsSection** — One `PartslotSection` per partslot group:
   - Blue pill header with name + count badge
   - Horizontal product card row (scrollable on all viewports)
5. **Loading/Empty states**
6. **Scroll progress dot** (fixed position indicator)

## Scroll Rules

| Context                       | Mobile                                              | Tablet             | Desktop                            |
|-------------------------------|-----------------------------------------------------|--------------------|------------------------------------|
| Shelf (vertical)              | touch scroll, overscroll-contain                    | same               | same                               |
| Product row (horizontal)      | snap-x mandatory, 65% card width, peek effect       | snap-x, 45% width  | no snap, 250px cards, arrow buttons|
| Service tier row (horizontal) | 150px cards                                         | 180px cards        | 220px cards, arrow buttons         |
| Gesture isolation             | `touch-action: pan-x` + `overscroll-behavior: contain` | same           | N/A (arrows only)                  |

## HorizontalRow — The Key Primitive

All horizontal scrolling uses one shared component:
- Receives `viewportSize` to decide snap vs arrows
- Desktop: renders orange arrow buttons, no snap
- Mobile/Tablet: applies `snap-x snap-mandatory`, `touch-action: pan-x`, `overscroll-behavior: contain`
- Enforces `width: 100%; overflow: hidden` on wrapper, `overflow-x: auto` on scroll track
- Arrow clicks use `scrollTo` with `stopPropagation` + `preventDefault`
- Fade masks built in for desktop

## Navigation Behaviors

- `highlightedPartType` — scroll to matching partslot section, highlight header
- `scrollToCategory` — scroll to matching section, fire completion callback
- `highlightedProduct` — spotlight badge on matching product card
- Service package titles registered as scroll anchors via `groupRefs`

## Data Rules

- `preparedTiers[]` is consumed directly from the API — NO client-side price calculation
- Hidden tiers (`isHidden: true`) are filtered out before rendering
- Rear brake disc/drum filtering uses shared `rearBrakeFilter.ts` utility
- `displayPrice` is the authoritative price for each product (already includes quantity)
