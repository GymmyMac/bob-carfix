

## Establishing Bob's Quality Baseline

### Current State

Bob has a four-layer regression prevention strategy, but the test coverage has gaps that should be filled now while everything is working well:

| Layer | Status | Coverage |
|---|---|---|
| E2E (Playwright) | 6 tests exist | Vehicle lookup, drawer position, PTT, tier display, init |
| Unit (Vitest) | 1 test file exists | Callback mapping, tier validation, empty states |
| Runtime contracts | In edge functions | vehicleId, preparedTiers validation |
| Architectural | In code | useRef callbacks, CSS containment |

**What's missing from the baseline:**
- No unit tests for the rear brake Disc/Drum filter (newly added)
- No unit tests for bundle discount pricing logic (newly added)
- No E2E test for the Disc/Drum toggle interaction
- No E2E test for bundle discount display (was/now pricing)
- The existing unit test file doesn't cover the new `PreparedTier` fields (`originalTotalPrice`, `savingsAmount`, `bundleDiscountPercentage`)

### Plan: Lock In the Baseline

#### 1. New Unit Test File: Rear Brake Filter (`rearBrakeFilter.test.ts`)

Test the pure utility functions in `packages/bob-widget/src/utils/rearBrakeFilter.ts`:

- `isRearBrakePackage` correctly identifies rear brake packages by id and title
- `isRearBrakePackage` returns false for "Front Brake Service", "Oil Service", etc.
- `filterByBrakeType('disc')` removes SHOE and DRUM products, keeps PAD and ROTOR
- `filterByBrakeType('drum')` removes PAD and ROTOR products, keeps SHOE and DRUM
- Both modes keep neutral products like BRAKE FLUID
- `recalcTierTotal` correctly sums displayPrice of filtered products
- Edge case: empty product array returns 0 total

#### 2. New Unit Test File: Bundle Discount Pricing (`bundleDiscount.test.ts`)

Test the rendering logic for the new PreparedTier discount fields:

- When `savingsAmount > 0`: verify was/now values are correct
- When `savingsAmount === 0`: verify no discount display needed
- Cart discount multiplier: `1 - (bundleDiscountPercentage / 100)` produces correct discounted unit prices
- Rounding: `Math.round(displayPrice * multiplier * 100) / 100` handles cents correctly
- Edge cases: 0% discount, 50% discount (max), fractional percentages

#### 3. Update Existing Unit Tests: Add New Tier Fields

Update `Bob.callbacks.test.ts` mock data to include `originalTotalPrice`, `savingsAmount`, and `bundleDiscountPercentage` so the existing tier validation tests cover the complete data shape.

#### 4. New E2E Test: Disc/Drum Toggle

Add to `e2e/bob-critical-flows.spec.ts`:

- Look up rego AMA993
- Navigate to Rear Brake Service package
- Verify toggle is visible
- Switch to Drum mode -- verify product list changes (no PAD/ROTOR text visible)
- Switch back to Disc mode -- verify PAD/ROTOR products return
- Verify price updates on toggle switch

#### 5. New E2E Test: Bundle Discount Display

Add to `e2e/bob-critical-flows.spec.ts`:

- Look up rego AMA993
- Open a service package with a bundle discount
- Verify strikethrough price is visible (original price)
- Verify "SAVE" badge text is present
- Verify the bold price (discounted) is lower than the struck-through price

### Technical Details

**Files to create:**
- `packages/bob-widget/src/__tests__/rearBrakeFilter.test.ts` -- pure function unit tests
- `packages/bob-widget/src/__tests__/bundleDiscount.test.ts` -- discount logic unit tests

**Files to modify:**
- `packages/bob-widget/src/__tests__/Bob.callbacks.test.ts` -- add new tier fields to mock data
- `e2e/bob-critical-flows.spec.ts` -- add Disc/Drum toggle and bundle discount E2E tests

**No production code changes.** This is purely additive test coverage to snapshot Bob's current working state.

### Outcome

After this work, the test suite becomes a **locked baseline** -- any future change that breaks vehicle lookup, tier rendering, brake type filtering, or bundle discount display will fail a specific, named test. Running the full suite before any Bob change gives confidence that nothing has regressed.

