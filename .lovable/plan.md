
# Fix Variant Card Display Format

## Problem
Currently showing characterization (e.g., "The peppy one") as the primary title. User wants technical differences only.

## Solution
Update the `VariantCardItem` component to show:
- **Primary Title**: Technical specs that differentiate variants (engine code, kW, cc, fuel type)
- **Remove**: Characterization from display entirely

The header already shows "Which TOYOTA ALTEZZA?" so each card just needs to highlight what makes that variant different.

## Visual Result

**Before:**
```
┌─────────────────────────────────────────┐
│ [1]  The peppy one                      │
│      3S-GE · 147kW · 2.0L · Petrol      │
└─────────────────────────────────────────┘
```

**After:**
```
┌─────────────────────────────────────────┐
│ [1]  3S-GE · 147kW · 2.0L · Petrol      │
└─────────────────────────────────────────┘
```

---

## Technical Changes

**File: `src/components/VariantSelectionCards.tsx`**

Update lines 88-92 - replace the characterization-first logic:

```typescript
// OLD (lines 88-92):
const primaryTitle = variant.characterization || specsLine || variant.displayTitle;
const subtitle = variant.characterization ? specsLine : null;

// NEW:
// Show technical differences as the primary title - no characterization
const primaryTitle = specsLine || variant.displayTitle;
const subtitle = null; // No subtitle needed - specs are the headline
```

This ensures each card shows only the differentiating technical specs (engine code, power, displacement, fuel type) without the personality characterization.
