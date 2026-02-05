
# Comprehensive Regression Prevention Strategy for Bob

## Executive Summary

Bob has experienced multiple regressions affecting three critical areas:
1. **Chat drawer positioning** - incorrect placement before/after expand/collapse
2. **Product display** - parts not rendering despite 500 items being received
3. **Price recommendations** - AI quoting cheapest tier instead of CARFIX VALUE tier

This plan establishes a multi-layered defense strategy to eliminate future regressions through automated testing, contract enforcement, and architectural safeguards.

---

## Current Architecture Analysis

### Critical Data Flow Paths

```text
User Input → useBobChat → bob-chat Edge Function → CARFIX APIs
                ↓
     SSE Events (parts_found, service_packages_found, vehicle_identified)
                ↓
     Bob.tsx Callbacks → State Updates → ContainedMobileBobLayout
                ↓
     MobileProductColumn → Product Rendering
```

### Identified Regression Points

| Component | Regression Type | Root Cause Pattern |
|-----------|-----------------|-------------------|
| Bob.tsx (L143-191) | Callback instability | useEffect recreates callbacks on re-render |
| ContainedChatDrawer | CSS positioning drift | Implicit top values during expand/collapse |
| bob-chat index.ts | API parameter naming | snake_case vs camelCase inconsistency |
| AI prompt adherence | Wrong tier selection | Prompt instructions not followed strictly |

---

## Prevention Strategy: 4 Layers of Defense

### Layer 1: End-to-End Playwright Tests

Create automated tests for critical user journeys that run on every deployment.

**File: `e2e/bob-critical-flows.spec.ts`**

Test scenarios to implement:
1. **Vehicle Lookup Flow**
   - Enter REGO "AMA993" → Verify vehicle identified event
   - Verify service packages appear on shelf
   - Verify individual parts appear in grouped sections
   - Assert product count matches SSE event count

2. **Chat Drawer Positioning**
   - Verify drawer bottom is at container edge when collapsed
   - Expand drawer → verify 55% height
   - Collapse drawer → verify returns to 110px
   - Verify PTT button fully visible at all states

3. **Service Package Tier Display**
   - Verify "CARFIX VALUE" badge appears on recommended tier
   - Extract displayed price from recommended tier
   - Verify AI verbal recommendation matches displayed price

4. **Product Shelf Rendering**
   - Trigger parts_found with mock 500 items
   - Assert all groupedProducts render
   - Verify scroll functionality works

### Layer 2: Unit Tests for State Management

**File: `packages/bob-widget/src/__tests__/Bob.callbacks.test.ts`**

Test callback stability and state persistence:

```typescript
// Test 1: onPartsFound updates products state correctly
test('onPartsFound should update products state', () => {
  // Render Bob component
  // Call callbacks.onPartsFound with mock parts
  // Assert products state has correct length
});

// Test 2: Callback references remain stable across re-renders
test('callback references should be stable', () => {
  // Capture initial callback reference
  // Trigger re-render
  // Assert callback reference unchanged
});

// Test 3: Products are not cleared by subsequent empty calls
test('products should persist when new request starts', () => {
  // Load 500 products
  // Trigger isResearching = true
  // Assert products still present
});
```

### Layer 3: Contract Validation (Edge Function)

Add runtime validation in `bob-chat/index.ts` to catch data issues before they reach the frontend.

**Validation checkpoints:**

1. **Vehicle ID Validation**
```typescript
// Before parts fetch - ENFORCE TecDoc vehicle_id
const validateVehicleId = (vehicleId: number | null, source: string): boolean => {
  if (vehicleId === null || vehicleId <= 0) {
    console.error(`[VALIDATION FAIL] Invalid vehicle_id from ${source}: ${vehicleId}`);
    return false;
  }
  return true;
};
```

2. **Prepared Tiers Validation**
```typescript
// Before emitting service_packages_found
const validatePreparedTiers = (pkg: any): boolean => {
  if (!pkg.preparedTiers || !Array.isArray(pkg.preparedTiers)) {
    console.warn(`[VALIDATION] Package ${pkg.id} missing preparedTiers`);
    return false;
  }
  const hasRecommended = pkg.preparedTiers.some((t: any) => t.isRecommended === true);
  if (!hasRecommended) {
    console.warn(`[VALIDATION] Package ${pkg.id} has no recommended tier!`);
  }
  return true;
};
```

3. **Parts Emission Validation**
```typescript
// Before emitting parts_found
const validatePartsPayload = (parts: any[]): void => {
  console.log(`[VALIDATION] Parts payload: ${parts.length} items`);
  if (parts.length > 0) {
    console.log(`[VALIDATION] Sample part:`, JSON.stringify(parts[0]).slice(0, 200));
  }
};
```

### Layer 4: Architectural Fixes

#### Fix 1: Stabilize Callback References in Bob.tsx

Replace mutable callback assignment with stable refs:

```typescript
// Bob.tsx - Stabilize callbacks using useRef + useCallback

// Create stable refs for handlers
const handlePartsFoundRef = useRef<((parts: unknown[]) => void) | null>(null);
const handlePackagesFoundRef = useRef<((packages: unknown[]) => void) | null>(null);

// Initialize handlers once
useEffect(() => {
  handlePartsFoundRef.current = (parts: unknown[]) => {
    setIsResearching(false);
    if (!parts || parts.length === 0) {
      setProducts([]);
      return;
    }
    const mappedProducts = /* mapping logic */;
    setProducts(mappedProducts);
  };
  
  handlePackagesFoundRef.current = (packages: unknown[]) => {
    if (!packages || packages.length === 0) {
      setServicePackages([]);
      return;
    }
    setServicePackages(packages as ServicePackage[]);
  };
}, []); // Empty deps - only run once

// Wire callbacks using stable refs
useEffect(() => {
  const originalOnPartsFound = callbacks.onPartsFound;
  const originalOnPackagesFound = callbacks.onServicePackagesFound;
  
  callbacks.onPartsFound = (parts) => handlePartsFoundRef.current?.(parts);
  callbacks.onServicePackagesFound = (packages) => handlePackagesFoundRef.current?.(packages);
  
  return () => {
    callbacks.onPartsFound = originalOnPartsFound;
    callbacks.onServicePackagesFound = originalOnPackagesFound;
  };
}, [callbacks]);
```

#### Fix 2: Explicit CSS Containment for Chat Drawer

Add explicit positioning constraints in ContainedChatDrawer.tsx:

```typescript
style={{
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  top: 'auto',  // Explicitly unset - prevents stuck positioning
  contain: 'layout',  // CSS containment for isolation
  willChange: 'height',  // Optimize transitions
  height: isExpanded ? '55%' : '110px',
  // ... rest of styles
}}
```

#### Fix 3: Explicit CARFIX VALUE Price in Tool Response

Modify the `retrieve_service_packages` tool response processing to inject an explicit summary:

```typescript
// In bob-chat/index.ts after processing service packages

// Generate explicit recommended tier summary for AI
const generateRecommendedTierSummary = (packages: any[]): string => {
  const summaries: string[] = [];
  
  for (const pkg of packages) {
    if (pkg.preparedTiers && Array.isArray(pkg.preparedTiers)) {
      const recommended = pkg.preparedTiers.find((t: any) => t.isRecommended === true);
      if (recommended) {
        summaries.push(
          `📍 ${pkg.title}: CARFIX VALUE = ${recommended.tierName} tier at $${recommended.totalPrice.toFixed(2)}`
        );
      }
    }
  }
  
  return summaries.length > 0 
    ? `\n\n=== CARFIX VALUE TIERS (SPEAK THESE PRICES) ===\n${summaries.join('\n')}\n===`
    : '';
};

// Append to tool result
toolResultContent += generateRecommendedTierSummary(packages);
```

---

## Implementation Checklist

### Phase 1: Testing Infrastructure (Immediate)

- [ ] Create `e2e/bob-critical-flows.spec.ts` with vehicle lookup test
- [ ] Create `vitest.config.ts` for unit test setup
- [ ] Create `src/test/setup.ts` with required mocks
- [ ] Add test for callback stability in Bob.tsx
- [ ] Add test for products state persistence

### Phase 2: Architectural Fixes (Next)

- [ ] Refactor Bob.tsx callbacks to use stable refs
- [ ] Add `contain: layout` to ContainedChatDrawer
- [ ] Add explicit `top: auto` in drawer styles
- [ ] Add CSS transition scope limitation (`transition: height 0.3s, box-shadow 0.3s`)

### Phase 3: Contract Validation (Then)

- [ ] Add validateVehicleId before parts fetch
- [ ] Add validatePreparedTiers before package emission
- [ ] Add validatePartsPayload logging
- [ ] Add recommended tier summary injection

### Phase 4: CI Integration (Finally)

- [ ] Add Playwright tests to GitHub Actions workflow
- [ ] Set tests as blocking for deployment
- [ ] Add visual regression testing (optional, via Percy/Chromatic)

---

## Verification Criteria

After implementation, verify:

1. **Vehicle Lookup**: REGO "AMA993" → 500 parts + service packages visible
2. **Chat Positioning**: Drawer anchored at container bottom at all times
3. **PTT Button**: Fully visible (72px button not clipped by navigation)
4. **Price Accuracy**: Bob's verbal recommendation matches "CARFIX VALUE" badge price
5. **Products Persist**: Parts remain on shelf during new conversation turns

---

## Technical Files to Modify

| File | Changes |
|------|---------|
| `e2e/bob-critical-flows.spec.ts` | NEW - Playwright E2E tests |
| `vitest.config.ts` | NEW - Unit test configuration |
| `src/test/setup.ts` | NEW - Test setup with mocks |
| `packages/bob-widget/src/__tests__/Bob.callbacks.test.ts` | NEW - Callback stability tests |
| `packages/bob-widget/src/components/Bob.tsx` | Stabilize callback references |
| `packages/bob-widget/src/components/mobile/ContainedChatDrawer.tsx` | Explicit CSS containment |
| `supabase/functions/bob-chat/index.ts` | Add validation + tier summary injection |
| `.github/workflows/playwright.yml` | NEW - CI integration for tests |

---

## Long-Term Maintenance

1. **Before any Bob changes**: Run full E2E test suite locally
2. **PR requirements**: All tests must pass before merge
3. **Regression detected**: Add new test case covering the scenario
4. **Monthly review**: Audit test coverage against critical paths

This multi-layered approach ensures that regressions are caught at multiple stages - from unit tests catching callback issues, to E2E tests catching rendering problems, to runtime validation catching data issues before they corrupt the frontend state.
