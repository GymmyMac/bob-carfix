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
  performanceRed: "#DC2626", // Performance tier text
  mutedForeground: "#64748B", // Secondary text, descriptions
  background: "#FAFAFA",     // Page background
  card: "#FFFFFF",           // Card backgrounds
  border: "#E2E8F0",         // Card borders
  slateEconomy: "#475569",   // Economy tier text
} as const;

export const QUALITY_TIER_CONFIG = {
  Economy: {
    icon: "DollarSign",
    emoji: "💰",
    textColor: "#475569",
    background: "#F1F5F9",
    border: "#CBD5E1",
    description: "Smart savings",
  },
  Standard: {
    icon: "Star",
    emoji: "⭐",
    textColor: "#0052CC",
    background: "rgba(0,82,204,0.1)",
    border: "rgba(0,82,204,0.3)",
    description: "Best value",
    isRecommended: true,
  },
  Premium: {
    icon: "Award",
    emoji: "🏆",
    textColor: "#D97706",
    background: "#FEF3C7",
    border: "#FCD34D",
    description: "Superior quality",
  },
  Performance: {
    icon: "Zap",
    emoji: "⚡",
    textColor: "#DC2626",
    background: "#FEE2E2",
    border: "#FCA5A5",
    description: "Maximum power",
  },
} as const;

/**
 * Service Package Descriptions - Problem → Benefit → CFX Pack format
 */
export const SERVICE_PACKAGE_DESCRIPTIONS: Record<string, string> = {
  'Oil Change': 'Neglecting oil changes leads to engine wear, overheating, and catastrophic failure costing thousands. Quality oil and filters keep your engine running smoothly. Each CFX Oil Change Service Pack includes premium oil and filter matched to your engine specifications.',
  'Front Brake Service': 'Your front brakes handle 70% of stopping power. Worn pads dangerously increase stopping distance. Quality brake components ensure confident, safe stops. Each CFX Front Brake Service Pack includes pads and rotors to restore your braking performance.',
  'Rear Brake Service': 'Rear brakes provide stability and balance during emergency stops. Worn components cause instability and longer stopping distances. Each CFX Rear Brake Service Pack includes quality pads/shoes and rotors/drums for complete rear brake renewal.',
  'Timing Belt Service': 'A snapped timing belt destroys engines instantly, causing $8,000+ in damage. Preventive replacement is essential for peace of mind. Each CFX Timing Belt Service Pack includes the belt, tensioner, and related components.',
  'Wipers': 'Worn wipers reduce visibility in rain, compromising safety. Quality blades provide streak-free, clear vision. Each CFX Wipers Service Pack includes the gear you need to change all of your vehicle\'s wiper blades to restore your driving vision.',
  'Coolant Service': 'Old coolant causes overheating, warped cylinder heads, and engine seizure. Fresh coolant protects your entire cooling system. Each CFX Coolant Service Pack includes quality coolant matched to your vehicle\'s requirements.',
  'Air Filter Service': 'Clogged air filters reduce engine performance by 10% and increase fuel consumption. Clean filters improve power and economy. Each CFX Air Filter Service Pack includes a precision-fit filter for optimal airflow.',
  'Spark Plug Service': 'Worn spark plugs cause misfires, poor fuel economy, and catalytic converter damage. Fresh plugs restore smooth, efficient running. Each CFX Spark Plug Service Pack includes quality plugs matched to your engine.',
  'Battery Service': 'A failing battery leaves you stranded without warning. Reliable power is essential for starting and electronics. Each CFX Battery Service Pack includes a quality battery sized for your vehicle\'s demands.',
  'Cabin Filter': 'Cabin filters clean the air you and your passengers breathe. Replace regularly to remove pollen, dust, and odours. Each CFX Cabin Filter Service Pack includes a quality filter for fresh, clean cabin air.',
  'Fuel Filter Service': 'Clogged fuel filters restrict flow, causing poor performance and potential engine damage. Clean fuel is critical for efficiency. Each CFX Fuel Filter Service Pack includes a quality filter for optimal fuel delivery.',
  'Transmission Service': 'Old transmission fluid causes rough shifting, slipping, and premature wear. Fresh fluid extends transmission life. Each CFX Transmission Service Pack includes quality fluid matched to your transmission type.',
};

export const DEFAULT_SERVICE_DESCRIPTION = 'Keep your vehicle running safely and efficiently with quality parts matched to your specific make and model. Each CFX Service Pack includes everything you need for this essential maintenance.';

export const IMAGE_URLS = {
  storageBase: 'https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public',
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
  partslot_description?: string;
  per_car_qty?: number;
}): boolean {
  const name = product.name?.toLowerCase() || "";
  const partslot = (product.partslotDescription || product.partslot_description || "").toLowerCase();
  
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

/**
 * Get service package description with fallback
 */
export function getServicePackageDescription(title: string): string {
  // Try exact match first
  if (SERVICE_PACKAGE_DESCRIPTIONS[title]) {
    return SERVICE_PACKAGE_DESCRIPTIONS[title];
  }
  // Try partial match
  const lowerTitle = title.toLowerCase();
  for (const [key, description] of Object.entries(SERVICE_PACKAGE_DESCRIPTIONS)) {
    if (lowerTitle.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerTitle)) {
      return description;
    }
  }
  return DEFAULT_SERVICE_DESCRIPTION;
}
