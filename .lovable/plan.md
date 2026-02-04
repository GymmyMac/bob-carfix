
# Vehicle Variant Selection Cards on Bob's Shelf

## Overview

When Bob detects multiple vehicle variants from a REGO lookup, instead of only speaking the options, we will display clickable variant cards directly on the product shelf. This provides a faster, more intuitive selection method that works for both:
- **Touch/Click users** - tap the card directly
- **Voice users** - say the number or describe the variant (existing behavior)

## Current Flow

```text
1. User enters REGO (e.g., "MKT21")
2. Backend finds 4 Toyota Altezza variants
3. Backend emits `vehicle_candidates_found` SSE event
4. Bob speaks: "I found 4 versions... 1) The rev-happy 147kW..."
5. User must SPEAK or TYPE their selection
6. Backend matches input → confirms vehicle
```

## Proposed Flow

```text
1. User enters REGO (e.g., "MKT21")
2. Backend finds 4 Toyota Altezza variants
3. Backend emits NEW `variant_selection_required` SSE event with enhanced data
4. Frontend displays variant cards on shelf (replaces products temporarily)
5. Bob speaks the options
6. User can:
   a) TAP a variant card → sends selection message automatically
   b) SPEAK/TYPE their choice (existing behavior)
7. Backend confirms vehicle → shelf transitions to products
```

---

## Technical Implementation

### Phase 1: Enhanced SSE Event from Backend

Modify the `AWAITING_VARIANT_SELECTION` state handler in `bob-chat/index.ts` to emit richer variant data suitable for UI cards.

**File: `supabase/functions/bob-chat/index.ts`**

New SSE event structure:

```typescript
{
  type: "variant_selection_required",
  candidates: [
    {
      vehicle_id: 42899,
      optionNumber: 1,
      displayTitle: "The rev-happy 147kW",
      displaySubtitle: "3S-GE engine • 2.0L Petrol",
      characterization: "rev-happy",
      kw: 147,
      cc: 2000,
      ccDisplay: "2.0L",
      fuelType: "Petrol",
      engineCode: "3S-GE",
      make: "TOYOTA",
      model: "ALTEZZA"
    },
    // ... more variants
  ],
  make: "TOYOTA",
  model: "ALTEZZA",
  promptText: "I found 4 versions of the Toyota Altezza. Which one is yours?"
}
```

Changes to existing code:
- Refactor `generateVariantListText` to also return structured data for UI
- Emit new `variant_selection_required` event before the text response
- Keep existing `vehicle_candidates_found` for backwards compatibility

### Phase 2: Frontend State for Variant Selection

Modify `useBobChat.ts` and `Index.tsx` to handle the new event.

**File: `src/hooks/useBobChat.ts`**

Add new callback prop:

```typescript
interface UseBobChatProps {
  // ... existing props
  onVariantSelectionRequired?: (variants: VariantCard[]) => void;
}
```

Handle the new SSE event:

```typescript
if (parsed.type === "variant_selection_required") {
  onVariantSelectionRequired?.(parsed.candidates);
  continue;
}
```

**File: `src/pages/Index.tsx`**

Add state for pending variants:

```typescript
const [pendingVariants, setPendingVariants] = useState<VariantCard[]>([]);
```

Pass to layout:

```typescript
<MobileBobLayoutCore
  // ... existing props
  pendingVariants={pendingVariants}
  onVariantSelect={(variant) => {
    // Send selection as user message
    setInput(`Option ${variant.optionNumber}`);
    setTimeout(handleSend, 100);
    setPendingVariants([]); // Clear after selection
  }}
/>
```

Clear variants when vehicle is confirmed:

```typescript
onVehicleIdentified: (vehicle) => {
  setPendingVariants([]); // Clear variant cards
  setDisplayedVehicle(vehicle);
  // ...
}
```

### Phase 3: Variant Selection UI Component

Create a new component for displaying clickable variant cards.

**New File: `src/components/VariantSelectionCards.tsx`**

```typescript
interface VariantCard {
  vehicle_id: number;
  optionNumber: number;
  displayTitle: string;
  displaySubtitle: string;
  characterization: string;
  kw?: number;
  cc?: number;
  fuelType?: string;
  engineCode?: string;
}

interface VariantSelectionCardsProps {
  variants: VariantCard[];
  make: string;
  model: string;
  onSelect: (variant: VariantCard) => void;
}
```

Card design (CARFIX glass style):
- Large touch target (minimum 60px height)
- Option number badge (1, 2, 3...)
- Characterization as headline ("The rev-happy one")
- Technical specs as subtitle (147kW • 2.0L • 3S-GE)
- Tap anywhere to select
- Visual feedback on press

### Phase 4: Integrate into Product Shelf

Modify `MobileProductColumn.tsx` to conditionally render variant cards instead of products.

**File: `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`**

Add new props:

```typescript
interface MobileProductColumnProps {
  // ... existing props
  pendingVariants?: VariantCard[];
  onVariantSelect?: (variant: VariantCard) => void;
}
```

Render logic:

```typescript
// Show variant selection cards when pending
if (pendingVariants && pendingVariants.length > 0) {
  return (
    <VariantSelectionSection
      variants={pendingVariants}
      onSelect={onVariantSelect}
    />
  );
}

// Otherwise show normal products/packages
return (
  // ... existing product grid
);
```

### Phase 5: Also Update MobileBobLayoutCore

Pass the variant props through from the layout container.

**File: `packages/bob-widget/src/components/mobile/MobileBobLayoutCore.tsx`**

Add props:

```typescript
interface MobileBobLayoutCoreProps {
  // ... existing props
  pendingVariants?: VariantCard[];
  onVariantSelect?: (variant: VariantCard) => void;
}
```

Pass to MobileProductColumn:

```typescript
<MobileProductColumn
  // ... existing props
  pendingVariants={pendingVariants}
  onVariantSelect={onVariantSelect}
/>
```

---

## Variant Card Visual Design

```text
┌──────────────────────────────────────────────────────────────┐
│  ┌───┐                                                       │
│  │ 1 │   The rev-happy one                                   │
│  └───┘   147kW • 2.0L Petrol • 3S-GE engine                  │
│                                                              │
│                                           [ Tap to select ]  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  ┌───┐                                                       │
│  │ 2 │   The sensible one                                    │
│  └───┘   114kW • 2.0L Petrol • 1G-FE engine                  │
│                                                              │
│                                           [ Tap to select ]  │
└──────────────────────────────────────────────────────────────┘
```

Styling:
- Background: Glass effect matching existing shelf cards
- Badge: CARFIX blue (#0066CC) circle with white number
- Headline: 16px semibold, uses the characterization
- Subtitle: 12px muted, shows technical differentiators
- Touch target: Full card is tappable
- Hover/Press: Scale and shadow animation

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/bob-chat/index.ts` | Add `variant_selection_required` SSE event with structured data |
| `src/hooks/useBobChat.ts` | Add `onVariantSelectionRequired` callback, handle new event |
| `src/pages/Index.tsx` | Add `pendingVariants` state, pass to layout, handle selection |
| `src/components/VariantSelectionCards.tsx` | **NEW** - Clickable variant card component |
| `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx` | Conditionally render variant cards |
| `packages/bob-widget/src/components/mobile/MobileBobLayoutCore.tsx` | Pass variant props through |
| `src/types/vehicle.ts` | Add `VariantCard` interface |

---

## User Experience Flow

1. **User enters REGO** → "MKT21"
2. **Bob starts researching** → Shelf shows loading state
3. **Multiple variants found** → Shelf displays 4 variant cards
4. **Bob speaks** → "I found 4 versions of the Toyota Altezza..."
5. **User taps card #1** → System sends "Option 1" message
6. **Vehicle confirmed** → Cards disappear, products load
7. **Bob speaks** → "Sweet as, the rev-happy Altezza! Let me grab the parts..."

---

## Edge Cases Handled

- **Single variant**: No cards shown, auto-confirms
- **Voice selection**: Cards cleared when vehicle confirmed via speech
- **Timeout**: If no selection after 60 seconds, cards remain but Bob can prompt again
- **Navigation away**: Cards cleared on page refresh/navigation

---

## Summary

This implementation provides a visual, touch-friendly alternative to voice-only variant selection. Users can tap their vehicle variant directly on the shelf, which automatically sends the selection to Bob. The existing voice/text selection continues to work alongside this new UI feature.

