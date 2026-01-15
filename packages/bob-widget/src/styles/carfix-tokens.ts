/**
 * CARFIX Design Tokens for Bob Widget
 * Matches the CARFIX website styling exactly
 */

export const CARFIX_COLORS = {
  primary: "#0052CC",        // Standard tier, CTAs, CARFIX Value badges
  primaryHover: "#0047B3",   // Darker for hover states
  secondary: "#38BDF8",      // Sky Blue accents, links
  foreground: "#0F172A",     // Deep Navy - headers, primary text
  accent: "#FF8C00",         // Orange Gold - Premium tier
  success: "#22C55E",        // "Fits Your Vehicle" badges
  destructive: "#EF4444",    // Performance tier
  mutedForeground: "#64748B", // Secondary text, descriptions
  background: "#FAFAFA",     // Page background
  card: "#FFFFFF",           // Card backgrounds
  border: "#E2E8F0",         // Card borders
} as const;

export const QUALITY_TIER_CONFIG = {
  Economy: {
    icon: "DollarSign",
    textColor: "#475569",
    background: "#F1F5F9",
    border: "#CBD5E1",
    description: "Budget-friendly option",
  },
  Standard: {
    icon: "Star",
    textColor: "#0052CC",
    background: "rgba(0,82,204,0.1)",
    border: "rgba(0,82,204,0.3)",
    description: "Quality & value balance",
    isRecommended: true,
  },
  Premium: {
    icon: "Award",
    textColor: "#D97706",
    background: "#FEF3C7",
    border: "#FCD34D",
    description: "High-quality components",
  },
  Performance: {
    icon: "Zap",
    textColor: "#DC2626",
    background: "#FEE2E2",
    border: "#FCA5A5",
    description: "Maximum performance",
  },
} as const;

export const IMAGE_URLS = {
  productImage: (sku: string) =>
    `https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/product_images/${sku}.jpg`,
  brandLogo: (brandName: string) =>
    `https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/brand_images/${brandName.replace(/\s+/g, "")}.jpg`,
  carfixImage: (sku: string) =>
    `https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/carfix_images/${sku}_1.jpg`,
} as const;

export const BADGE_CONFIG = {
  fitsVehicle: {
    background: "rgba(34,197,94,0.1)",
    text: "#22C55E",
    border: "rgba(34,197,94,0.2)",
    icon: "Check",
    label: "Fits Your Vehicle",
  },
  viscosity: {
    background: "#EFF6FF",
    text: "#1D4ED8",
    border: "#BFDBFE",
    icon: "Gauge",
  },
  volume: {
    background: "#ECFEFF",
    text: "#0E7490",
    border: "#A5F3FC",
    icon: "Droplets",
  },
  quantity: {
    background: "#F1F5F9",
    text: "#475569",
    border: "#CBD5E1",
  },
  partNumber: {
    background: "transparent",
    text: "#64748B",
    border: "transparent",
  },
  carfixValue: {
    background: "rgba(0,82,204,0.1)",
    text: "#0052CC",
    border: "rgba(0,82,204,0.2)",
    icon: "Sparkles",
    label: "CARFIX Value",
  },
  rotorPair: {
    background: "#EFF6FF",
    text: "#1D4ED8",
    border: "#BFDBFE",
    label: "Pair",
  },
} as const;

export const TYPOGRAPHY = {
  packageTitle: { fontSize: "20px", fontWeight: 700 },
  partslotName: { fontSize: "14px", fontWeight: 600 },
  productName: { fontSize: "14px", fontWeight: 500 },
  description: { fontSize: "14px", fontWeight: 400 },
  priceMain: { fontSize: "20px", fontWeight: 700 },
  priceSecondary: { fontSize: "12px", fontWeight: 400 },
  tierLabel: { fontSize: "14px", fontWeight: 500 },
  badgeText: { fontSize: "12px", fontWeight: 500 },
} as const;

/**
 * Check if a product is a rotor (sold in pairs)
 */
export function isRotorProduct(product: {
  name?: string;
  partslotDescription?: string;
  per_car_qty?: number;
}): boolean {
  const name = product.name?.toLowerCase() || "";
  const partslot = product.partslotDescription?.toLowerCase() || "";
  
  return (
    name.includes("rotor") ||
    partslot.includes("disc rotor") ||
    partslot.includes("brake rotor") ||
    product.per_car_qty === 2
  );
}

/**
 * Get display price for a product (handles rotor pair pricing)
 */
export function getDisplayPrice(
  unitPrice: number,
  isRotor: boolean
): { displayPrice: number; unitPriceLabel?: string } {
  if (isRotor) {
    return {
      displayPrice: unitPrice * 2,
      unitPriceLabel: `$${unitPrice.toFixed(2)} each`,
    };
  }
  return { displayPrice: unitPrice };
}

/**
 * Format price as NZD currency
 */
export function formatNZD(price: number): string {
  return `$${price.toFixed(2)}`;
}
