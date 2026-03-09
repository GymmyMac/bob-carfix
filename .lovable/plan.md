

# Fix: Shelf Auto-Scrolling to Bottom on Product Load + Service Package Label Audit

## Problem 1 — Shelf Scrolls to Bottom on Load

**Root cause:** After the SSE stream completes, `useBobChat.ts` (lines 878-886) scans the **entire assistant response** for any `PART_TYPE_KEYWORDS` match and fires `onHighlightPart`. This triggers `MobileProductColumn`'s `useEffect` (line 204-216) which calls `scrollIntoView({ block: 'start' })` on the matched partslot section.

The keyword list includes very generic terms like `'brakes'`, `'oil filter'`, `'suspension'`, `'battery'` — words Bob uses routinely in his greeting/service package intro. So Bob says "brake pads and rotors" → keyword `'brakes'` matches → shelf scrolls to the BRAKE section (which could be alphabetically near the bottom with 350+ products).

**Fix:** Only trigger `onHighlightPart` from the **explicit SSE `highlight_category` event** (line 768), NOT from the naive keyword scan at lines 878-886. The keyword scan is a legacy fallback that conflicts with the server-side highlight system.

**File:** `packages/bob-widget/src/hooks/useBobChat.ts`
- Remove the post-stream `PART_TYPE_KEYWORDS` scan block (lines 878-886) that fires `onHighlightPart` after every message.
- The `highlight_category` SSE event (line 768) already handles this correctly and intentionally.

## Problem 2 — Service Package Label Verification

**Status: Labels are working correctly.** The `getServicePackageDescription()` function in `carfix-tokens.ts` has exact-match keys for all standard packages (Oil Change, Front Brake Service, Rear Brake Service, etc.) plus partial-match fallback. The `SERVICE_PACKAGE_DESCRIPTIONS` dictionary covers 12 package types with a sensible `DEFAULT_SERVICE_DESCRIPTION` fallback.

The tier rendering in `MobileProductColumn.tsx` (lines 469-813) correctly:
- Filters hidden tiers via `!tier.isHidden`
- Shows "Carfix Value" badge on `isRecommended` tiers
- Uses `tier.displayName` for tier labels
- Uses `pkg.title` for package headers
- Renders brand logos, price breakdowns, and add-to-cart buttons per tier

No changes needed for labeling.

## Implementation Summary

| File | Change |
|---|---|
| `useBobChat.ts` | Remove lines 878-886 (legacy keyword-scan `onHighlightPart` trigger) |
| `version.ts` | Bump to 3.2.6 |
| `package.json` | Bump to 3.2.6 |
| `CHANGELOG.md` | Document fix |

**Scope:** ~10 lines removed across 1 file + version bump in 3 files.

