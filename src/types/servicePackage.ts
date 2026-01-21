// CARFIX Service Packages API Response Types

export interface ServicePackagesApiResponse {
  success: boolean;
  data: {
    servicePackages: ServicePackage[];
    meta: ApiMeta;
  };
}

export interface ApiMeta {
  vehicleId: number;
  packageCount: number;
  processedAt: string;
  version: string;
  processingTimeMs: number;
}

export interface ServicePackage {
  id: string;
  title: string;
  description: string;
  from_price: number;
  partslots: Partslot[];
  category_count: number;
  estimated_time: string;
  difficulty_level: string;
  bundle_discount_percentage: number;
  icon_name?: string;
  display_order?: number;
  valueTiers?: ValueTierInfo[];
  carfixValueTier?: string;
  carfixValueProducts?: string[];
  priceRange?: { min: number; max: number };
  preparedTiers?: PreparedTier[];
  icon_url?: string;
}

/** Server-prepared tier data - ready to render */
export interface PreparedTier {
  tierName: string;
  displayName: string;
  description: string;
  isRecommended: boolean;
  isHidden: boolean;
  totalPrice: number;
  productCount: number;
  dominantBrand: string | null;
  brands: PreparedTierBrand[];
  products: PreparedTierProduct[];
}

export interface PreparedTierBrand {
  name: string;
  fullName: string;
  imageUrl: string;
}

export interface PreparedTierProduct {
  partslotId: number;
  partslotName: string;
  sku: string;
  name: string;
  brand: string;
  brandFullName: string;
  brandImageUrl: string;
  productImageUrl: string;
  price: number;
  unitPrice: number;
  displayPrice: number;
  isRotor: boolean;
  isMultiQty: boolean;
  perCarQty: number;
  partNumber: string | null;
  webDescription: string | null;
  viscosity: string | null;
  volume: number | null;
}

export interface Partslot {
  id: number;
  name: string;
  description: string;
  products: {
    quality_tiers: QualityTiers;
  };
}

export interface QualityTiers {
  Economy: Part[];
  Standard: Part[];
  Premium: Part[];
  Performance: Part[];
}

export interface Part {
  sku: string;
  name: string;
  brand: string;
  price: number;
  display_price?: number;
  is_on_sale?: boolean;
  sale_price?: number;
  was_price?: number;
  discount_percentage?: number;
  part_number?: string;
  web_description?: string;
  classification?: {
    primary_tier: string;
    sub_tier: string;
    display_name: string;
  };
}

export interface ValueTierInfo {
  tier: string;
  totalPrice: number;
  isCarfixValue: boolean;
  isBestPrice: boolean;
  isPremiumChoice: boolean;
  valueScore: number;
}
