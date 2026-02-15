
# v3.2.1 Release: Auto-Scroll to Highlighted Part Category

## Changes

### 1. Re-enable auto-scroll for `highlightedPartType` in MobileProductColumn
**File:** `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

Replace the removed comment block (lines 203-206) with a `useEffect` that scrolls to the matching partslot group when `highlightedPartType` changes. Uses existing `groupRefs` and `matchesPartType()` with a 300ms delay for animation safety. Does NOT affect initial scroll position, sort order, or individual product highlights.

### 2. Version bump to v3.2.1
Update version references across:
- `packages/bob-widget/package.json` -- `"version": "3.2.1"`
- `packages/bob-widget/src/version.ts` -- `'3.2.1'`
- `packages/bob-widget/bin/bob-widget.mjs` -- `VERSION = '3.2.1'`
- `packages/bob-widget/README.md` -- `v3.2.1`

### 3. Changelog entry
**File:** `packages/bob-widget/CHANGELOG.md`

Add new `[v3.2.1]` section before v3.2.0:

```
## [v3.2.1] - 2026-02-15

### Added
- Auto-scroll to highlighted partslot category on mobile/tablet when Bob mentions a specific part type (e.g. "front pads"), bringing parity with desktop behaviour

### Changed
- PTT idle button colour changed from blue to green to match the breathing idle ring
```

## Safety

- Only fires on `highlightedPartType` changes (not on mount or manual scroll)
- Uses existing proven utilities (`groupRefs`, `matchesPartType`)
- Desktop already works this way -- no changes needed there
- Sort order, initial position, and 8-second highlight timer are untouched
- Existing 52+ unit tests and E2E suite will validate no regressions
