/**
 * Bundle Discount Pricing — Baseline Unit Tests
 *
 * Tests the rendering decisions and cart discount calculations
 * for the PreparedTier bundle discount fields.
 */

import { describe, it, expect } from "vitest";

// ── Helpers (mirror the production logic) ──────────────────────
function shouldShowDiscount(tier: { savingsAmount?: number }): boolean {
  return (tier.savingsAmount ?? 0) > 0;
}

function calcDiscountedUnitPrice(
  displayPrice: number,
  bundleDiscountPercentage: number
): number {
  const multiplier = 1 - bundleDiscountPercentage / 100;
  return Math.round(displayPrice * multiplier * 100) / 100;
}

// ── Mock tiers ─────────────────────────────────────────────────
const discountedTier = {
  tierName: "Standard",
  totalPrice: 350.55,
  originalTotalPrice: 389.5,
  savingsAmount: 38.95,
  bundleDiscountPercentage: 10,
};

const noDiscountTier = {
  tierName: "Economy",
  totalPrice: 150.0,
  originalTotalPrice: 150.0,
  savingsAmount: 0,
  bundleDiscountPercentage: 0,
};

// ── Display decision ───────────────────────────────────────────
describe("Bundle discount display decision", () => {
  it("shows discount when savingsAmount > 0", () => {
    expect(shouldShowDiscount(discountedTier)).toBe(true);
  });

  it("hides discount when savingsAmount === 0", () => {
    expect(shouldShowDiscount(noDiscountTier)).toBe(false);
  });

  it("hides discount when savingsAmount is undefined", () => {
    expect(shouldShowDiscount({})).toBe(false);
  });
});

// ── Cart discount multiplier ───────────────────────────────────
describe("Cart discounted unit price", () => {
  it("applies 10% discount correctly", () => {
    // 100.00 * 0.9 = 90.00
    expect(calcDiscountedUnitPrice(100.0, 10)).toBe(90.0);
  });

  it("applies 0% discount (no change)", () => {
    expect(calcDiscountedUnitPrice(45.99, 0)).toBe(45.99);
  });

  it("applies 50% discount (max)", () => {
    expect(calcDiscountedUnitPrice(200.0, 50)).toBe(100.0);
  });

  it("handles fractional percentage correctly", () => {
    // 100 * 0.925 = 92.50
    expect(calcDiscountedUnitPrice(100.0, 7.5)).toBe(92.5);
  });

  it("rounds cents correctly on tricky values", () => {
    // 33.33 * 0.9 = 29.997 → 30.00
    expect(calcDiscountedUnitPrice(33.33, 10)).toBe(30.0);
    // 66.67 * 0.85 = 56.6695 → 56.67
    expect(calcDiscountedUnitPrice(66.67, 15)).toBe(56.67);
  });
});

// ── Was / Now consistency ──────────────────────────────────────
describe("Was/Now price consistency", () => {
  it("originalTotalPrice - savingsAmount === totalPrice", () => {
    const { originalTotalPrice, savingsAmount, totalPrice } = discountedTier;
    expect(originalTotalPrice! - savingsAmount!).toBeCloseTo(totalPrice, 2);
  });

  it("no-discount tier has equal original and total", () => {
    expect(noDiscountTier.originalTotalPrice).toBe(noDiscountTier.totalPrice);
  });
});
