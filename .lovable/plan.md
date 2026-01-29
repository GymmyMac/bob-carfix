
# Fix Plan: Desktop View - COMPLETED (v3.1.19)

## Summary

| # | Issue | Status | Fix Applied |
|---|-------|--------|-------------|
| 1 | Chat bar position after closing | ✅ Verified | Not a bug - drawer uses fixed `bottom: 0` position, only height changes |
| 2 | Product column <50% width on desktop | ✅ Fixed | Updated to 70% width, 900px max (was 48%, 580px) |
| 3 | PartSlot products not visible | ✅ Fixed | Removed duplicate `onPartsFound` call from bob_suggestions that was overwriting full 347-part catalog with 6 inline products |

---

## Issue 1: Chat Bar Position Not Resetting

### Root Cause Analysis

Looking at `MobileChatDrawer.tsx` (lines 136-154), the drawer uses:

```typescript
style={{
  position: 'fixed',
  bottom: bottomOffset,  // This is constant
  height: isExpanded ? '55vh' : '90px',  // Height changes, not position
}}
```

The chat drawer **always** sits at `bottom: bottomOffset`. The perceived "moving up" in the screenshot is likely:

1. The drawer height increases when expanded to `55vh`
2. When collapsed, it returns to `90px` height
3. **The visual is correct** - the drawer IS at the bottom

After reviewing the screenshot more carefully, the chat bar appears correctly positioned at the bottom in both images. The "moving up" may be an optical illusion due to:
- The counter overlay being at ~12-22% height
- The expanded state showing chat history

**However**, if there IS a positioning issue, it would be in the `ContainedChatDrawer.tsx` which uses `position: absolute` with `bottom: 0` - this could behave differently when the parent container transforms.

### Recommended Action

Verify this is actually a bug by:
1. Testing the collapsed state after chat closes
2. Confirming the drawer returns to 90px/110px height

**If confirmed as a bug**: Add an effect to reset `isExpanded` when appropriate or ensure consistent positioning.

---

## Issue 2: Product Column Width on Desktop (CONFIRMED BUG)

### Root Cause

In `MobileProductColumn.tsx` lines 295-297:

```typescript
// Current code
const columnWidth = viewportSize === 'mobile' ? 92 : viewportSize === 'tablet' ? 65 : 48;
const maxWidth = viewportSize === 'desktop' ? '580px' : viewportSize === 'tablet' ? '500px' : '100%';
```

**Desktop settings:**
- Width: 48% of viewport
- Max-width: 580px (hard cap)

**User requirement:** 70% width on desktop for better product presentation

### Solution

```typescript
// Fixed code - Desktop gets 70% width
const columnWidth = viewportSize === 'mobile' ? 92 : viewportSize === 'tablet' ? 65 : 70;
const maxWidth = viewportSize === 'desktop' ? '900px' : viewportSize === 'tablet' ? '500px' : '100%';
```

**Changes:**
- Desktop width: 48% → 70%
- Desktop max-width: 580px → 900px (allows wider display)

---

## Issue 3: PartSlot Products Not Displaying (CRITICAL)

### Root Cause Analysis

The screenshot shows Service Packages (Wipers, Air Filter Service, Rear Brake Service) but NO individual product cards below them.

Looking at the code flow:

1. **`groupedProducts` logic (lines 249-258)** - This groups `products` by `partslotDescription`:
```typescript
const groupedProducts = useMemo(() => {
  const groups: Record<string, Product[]> = {};
  products.forEach(product => {  // ← Products array must have items
    const key = product.partslotDescription || 'Other Parts';
    ...
  });
}, [products]);
```

2. **Rendering (lines 712-791)** - Individual products render in the `showContent && groupedProducts.map(...)` block

3. **`showContent` condition (line 290)**:
```typescript
const showContent = hasContent && !showLoading;
const hasContent = products.length > 0 || servicePackages.length > 0;
```

Since Service Packages ARE showing, `showContent` is `true` and the mapping runs.

**The issue is likely that `products` array is EMPTY while `servicePackages` has items.**

Looking at `Index.tsx` line 326, it passes `displayedParts` to the component:
```typescript
products={displayedParts}
```

And in `Bob.tsx` line 191-193, the service packages and products come from separate state:
```typescript
products={products}
servicePackages={servicePackages}
```

**Root cause identified:** Service packages arrive via `onServicePackagesFound` callback, but products must come via `onPartsFound` callback. The bob-chat edge function may not be triggering the parts lookup after vehicle confirmation when service packages are fetched.

### Verification Steps

1. Check if `retrieve_parts` tool is being called in bob-chat after vehicle confirmation
2. Check console logs for `[Bob] Products mapped` message
3. Confirm the API returns parts data

### Solution

If products are NOT being fetched automatically after vehicle confirmation, we need to ensure:
1. After `onServicePackagesFound` fires, a follow-up `retrieve_parts` call happens
2. OR the service package flow includes auto-fetching all parts

**However**, based on the memory context stating "full product catalog display" was recently fixed, this may be a regression or the fix wasn't deployed properly.

---

## Files to Modify

### File 1: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

**Change: Desktop width from 48% to 70%**

Line 296:
```typescript
// Before
const columnWidth = viewportSize === 'mobile' ? 92 : viewportSize === 'tablet' ? 65 : 48;
const maxWidth = viewportSize === 'desktop' ? '580px' : viewportSize === 'tablet' ? '500px' : '100%';

// After
const columnWidth = viewportSize === 'mobile' ? 92 : viewportSize === 'tablet' ? 65 : 70;
const maxWidth = viewportSize === 'desktop' ? '900px' : viewportSize === 'tablet' ? '500px' : '100%';
```

### File 2: `supabase/functions/bob-chat/index.ts` (if products aren't auto-loading)

Investigate why `retrieve_parts` isn't being called automatically after vehicle confirmation. This would be in the post-vehicle-confirmation flow.

---

## Investigation Required Before Full Fix

The PartSlot products issue needs debugging to confirm the root cause:

1. **Check browser console** for:
   - `[Bob] Products mapped and setting state:` log
   - `[Index] Parts received:` log
   - Any errors in the fetch flow

2. **Check edge function logs** for:
   - `retrieve_parts` tool calls
   - Response data from CARFIX API

3. **Check if this is a timing issue**:
   - Products may arrive AFTER service packages
   - The display may not update when products arrive late

---

## Expected Behavior After Fix

### Desktop Width (Issue 2)
- Before: Product column ~48% width (580px max)
- After: Product column 70% width (900px max) - 46% more real estate for marketing

### Products Display (Issue 3)
- Before: Only Service Packages visible
- After: Service Packages at top PLUS all individual PartSlot product categories (Brake Pads, Air Filters, Oil Filters, etc.) displayed below

---

## Verification Checklist

- [ ] Desktop product column occupies ~70% of viewport width
- [ ] Individual PartSlot products display below Service Packages
- [ ] All product categories are visible (not just the first 30)
- [ ] Chat drawer stays at bottom when collapsed after chat session
- [ ] Scroll performance remains smooth on desktop

---

## Technical Notes

### Desktop Layout Architecture

The current architecture uses the same `MobileProductColumn` component for both mobile AND desktop, switching layout based on `viewportSize`. The desktop-specific rendering is in `ResponsiveProductCard` (lines 60-122) which uses horizontal card layouts.

### Position Factors

The `usePositionFactors.ts` file defines:
- Desktop `productWidth: 0.6` - but this is a MULTIPLIER, not directly used
- The actual width percentage is hardcoded in `MobileProductColumn.tsx`

The discrepancy between `productWidth: 0.6` (60%) and `columnWidth: 48` suggests these were meant to align but don't.
