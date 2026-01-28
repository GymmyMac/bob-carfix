
# Implementation Plan: CARFIX Language, Value Recommendation, and Button Styling (v3.1.18)

## Summary of Changes

| # | Change | Location | Impact |
|---|--------|----------|--------|
| 1 | Replace "CFX" with "CARFIX" in Bob's speech | Database prompts + Edge function | 🔴 Critical |
| 2 | Update Bob to verbally recommend "CARFIX Value" tier | Database prompts | 🔴 Critical |
| 3 | Green Add button for Value tier, green text for others | MobileProductColumn + ServicePackageDetailView | 🟡 Medium |
| 4 | Update carfix-tokens descriptions | carfix-tokens.ts | 🟡 Medium |

---

## Technical Details

### 1. Database Prompt Update (sales_flow)

The `bob_prompts` table contains the `sales_flow` prompt that tells Bob how to present service packages. Current text includes:

- "CFX SERVICE PACKS FIRST"
- "CFX Service Pack"
- "Standard tier" as "RECOMMENDED"

**Update to:**

```
SALES WORKFLOW - CARFIX SERVICE PACKS FIRST:
...
3. Once vehicle confirmed: ALWAYS recommend the relevant CARFIX Service Pack before individual parts
4. Present Service Packs by VALUE TIER (Economy, Standard, Premium, Performance)
5. Highlight the "CARFIX Value" option (Standard tier) - best value for most customers
...
- Example: "Worn brakes increase stopping distance - pretty dangerous, mate. The CARFIX Front Brake Service Pack includes quality pads and rotors. I'd recommend the CARFIX Value option - best value at around $XXX"
...
- Confirm additions: "Added the [tier] CARFIX [Package] to your cart..."
```

### 2. Edge Function Tool Description

**File:** `supabase/functions/bob-chat/index.ts`  
**Line 278:**

```typescript
// BEFORE:
description: "Fetch pre-configured CFX Service Packs with preparedTiers..."

// AFTER:
description: "Fetch pre-configured CARFIX Service Packs with preparedTiers..."
```

### 3. Service Package Descriptions

**File:** `packages/bob-widget/src/styles/carfix-tokens.ts`  
**Lines 62-76:**

Replace all "CFX" occurrences with "CARFIX":

```typescript
// BEFORE:
'Each CFX Oil Change Service Pack includes...'
'Each CFX Front Brake Service Pack includes...'
// etc.

// AFTER:
'Each CARFIX Oil Change Service Pack includes...'
'Each CARFIX Front Brake Service Pack includes...'
// etc.
```

Also update `DEFAULT_SERVICE_DESCRIPTION`:

```typescript
// BEFORE:
export const DEFAULT_SERVICE_DESCRIPTION = '...Each CFX Service Pack includes everything...';

// AFTER:
export const DEFAULT_SERVICE_DESCRIPTION = '...Each CARFIX Service Pack includes everything...';
```

### 4. Button Styling - Value Tier = Solid Green, Others = Green Text

**File:** `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx`  
**Lines 642-648:**

```typescript
// BEFORE:
style={{
  background: tier.isRecommended ? CARFIX_COLORS.primary : '#F1F5F9',
  color: tier.isRecommended ? 'white' : '#475569',
  border: tier.isRecommended ? 'none' : '1px solid #E2E8F0',
}}

// AFTER - Green for recommended, green TEXT for others:
style={{
  background: tier.isRecommended ? '#22C55E' : '#F1F5F9', // Green button for Value
  color: tier.isRecommended ? 'white' : '#22C55E',        // Green text for others
  border: tier.isRecommended ? 'none' : '1px solid #E2E8F0',
}}
```

**File:** `packages/bob-widget/src/components/mobile/ServicePackageDetailView.tsx`  
**Lines 239-243:**

```typescript
// BEFORE:
className={`... ${
  tier.isRecommended 
    ? 'bg-[#0052CC] text-white...' 
    : 'bg-slate-100 text-slate-700...'
}`}

// AFTER - Green styling:
className={`... ${
  tier.isRecommended 
    ? 'bg-[#22C55E] text-white shadow-md hover:bg-[#16A34A]' 
    : 'bg-slate-100 text-[#22C55E] border border-slate-200 hover:bg-slate-200'
}`}
```

Also remove the cart icon (per previous request):

```tsx
// Remove lines 245-247 (cart icon SVG)
// Button text only: "Add to Cart" centered
```

---

## Visual Result

### Service Card Buttons After Change:

| Tier | Button Background | Text Color | Cart Icon |
|------|-------------------|------------|-----------|
| Economy | Slate (#F1F5F9) | Green (#22C55E) | ❌ Removed |
| **CARFIX Value** | **Green (#22C55E)** | **White** | ❌ Removed |
| Premium | Slate (#F1F5F9) | Green (#22C55E) | ❌ Removed |
| Performance | Slate (#F1F5F9) | Green (#22C55E) | ❌ Removed |

---

## Files to Modify

1. **Database Migration** - Update `bob_prompts` sales_flow content
2. `supabase/functions/bob-chat/index.ts` - Tool description
3. `packages/bob-widget/src/styles/carfix-tokens.ts` - Service descriptions
4. `packages/bob-widget/src/components/mobile/MobileProductColumn.tsx` - Button styling
5. `packages/bob-widget/src/components/mobile/ServicePackageDetailView.tsx` - Button styling + remove icon
6. `packages/bob-widget/package.json` - Version bump to 3.1.18
7. `packages/bob-widget/src/version.ts` - Version bump
8. `packages/bob-widget/CHANGELOG.md` - Add entry

---

## Bob's Updated Speech Pattern

**Before:**
> "I'd recommend the CFX Front Brake Service Pack - the Standard tier is best value at around $185"

**After:**
> "I'd recommend the CARFIX Front Brake Service Pack - the CARFIX Value option is best value at around $185"

---

## Verification Checklist

1. Ask Bob about brakes → Verify he says "CARFIX Service Pack" not "CFX"
2. Verify he recommends "CARFIX Value" tier verbally
3. Check service cards: Value tier button = solid green, others = green text only
4. Check both MobileProductColumn and ServicePackageDetailView buttons match
5. Verify no cart icons on buttons
