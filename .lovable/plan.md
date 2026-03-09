

# Fix: Drum Brake Toggle Still Showing + Scroll to Service Package

## Two Issues

### Issue 1: Drum toggle still appears in MobileProductColumn.tsx
The `detectAvailableBrakeTypes` fix was applied to `ServicePackageDetailView.tsx` (the detail/expanded view) but **not** to `MobileProductColumn.tsx` (the inline accordion). Line 563 still only checks `{isRearBrake && (` without detecting whether both brake types have priced products.

### Issue 2: Scroll to service package not triggering
The ref registration (line 518) and `matchesPartType` logic are correct. The likely cause is that the post-stream word-scoring matcher at `useBobChat.ts:874` depends on `shelfCategoriesRef` containing service package titles — which it does (Bob.tsx line 88-96). However, the `highlight_category` SSE event is only emitted from one specific code path in the edge function (the diagnosis flow), not on normal or follow-up responses. The fallback word matcher should fire, but only if `highlightCategoryReceived` remains false. I'll add console logging to verify this fires, and also ensure the service packages are in `shelfCategoriesRef` at match time.

---

## Implementation

### File 1: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`

**Add `detectAvailableBrakeTypes` import and conditional toggle rendering** inside the `servicePackages.map()` block (around line 493-563):

1. Import `detectAvailableBrakeTypes` (already partially imported at line 7 — just add it)
2. After line 495, call `detectAvailableBrakeTypes(visibleTiers)` to get `{ hasDisc, hasDrum }`
3. Compute `effectiveBrakeType`: if only disc → 'disc', if only drum → 'drum', else use user selection
4. Use `effectiveBrakeType` instead of `brakeType` for filtering
5. Change line 563 from `{isRearBrake && (` to `{isRearBrake && hasDisc && hasDrum && (`

### File 2: Scroll debugging

Add a console log in the post-stream matcher to confirm it fires and what it matches. This will help verify whether the scroll issue is in matching or timing.

### Files changed

| File | Change |
|---|---|
| `MobileProductColumn.tsx` | Import `detectAvailableBrakeTypes`, add price-check gating to toggle, use effective brake type |

No API debugging needed. No new files.

