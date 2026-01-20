import React, { useState, useEffect, useMemo } from "react";
import { 
  QUALITY_TIER_CONFIG, 
  formatNZD, 
  IMAGE_URLS, 
  CARFIX_COLORS,
  isRotorProduct,
  getDisplayPrice,
  getServicePackageDescription
} from "../../styles/carfix-tokens";
import type { PreparedTier, PreparedTierProduct, PreparedTierBrand } from "../../types/product";

// Extended types for service package detail (legacy fallback)
interface Part {
  sku: string;
  name: string;
  brand: string;
  brand_full_name?: string;
  price: number;
  is_on_sale?: boolean;
  sale_price?: number;
  was_price?: number;
  discount_percentage?: number;
  image_url?: string;
  part_number?: string;
  web_description?: string;
  partslot_description?: string;
  per_car_qty?: number;
  classification?: {
    primary_tier: string;
    sub_tier: string;
    display_name: string;
  };
}

interface QualityTiers {
  Economy?: Part[];
  Standard?: Part[];
  Premium?: Part[];
  Performance?: Part[];
}

interface Partslot {
  id: number;
  name: string;
  description?: string;
  products: {
    quality_tiers: QualityTiers;
  };
}

interface ServicePackageDetail {
  id: string;
  title: string;
  description: string;
  from_price: number;
  estimated_time?: string;
  difficulty_level?: string;
  bundle_discount_percentage?: number;
  carfixValueTier?: string;
  carfixValueProducts?: string[];
  partslots?: Partslot[];
  preparedTiers?: PreparedTier[]; // Server-prepared tier data
  icon_url?: string;
}

interface ServicePackageDetailViewProps {
  package: ServicePackageDetail;
  onBack: () => void;
  onAddToCart?: (parts: Part[] | PreparedTierProduct[]) => void;
  onNavigateToProductPage?: (sku: string) => void;
}

type TierName = 'Economy' | 'Standard' | 'Premium' | 'Performance';

const TIER_ORDER: TierName[] = ['Economy', 'Standard', 'Premium', 'Performance'];

/**
 * ServicePackageDetailView - CARFIX Website Specification
 * Uses preparedTiers when available, falls back to client-side processing
 */
export const ServicePackageDetailView: React.FC<ServicePackageDetailViewProps> = ({
  package: pkg,
  onBack,
  onAddToCart,
  onNavigateToProductPage
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  // Check if we have server-prepared tier data
  const hasPreparedTiers = pkg.preparedTiers && pkg.preparedTiers.length > 0;
  
  // Filter visible tiers (not hidden)
  const visiblePreparedTiers = useMemo(() => {
    if (!hasPreparedTiers) return [];
    return pkg.preparedTiers!.filter(tier => !tier.isHidden);
  }, [pkg.preparedTiers, hasPreparedTiers]);
  
  // Debug logging
  useEffect(() => {
    console.log('[ServicePackageDetailView] Package:', pkg.title);
    console.log('[ServicePackageDetailView] Has preparedTiers:', hasPreparedTiers);
    console.log('[ServicePackageDetailView] Visible tiers:', visiblePreparedTiers.length);
    if (!hasPreparedTiers) {
      console.log('[ServicePackageDetailView] Falling back to partslots:', pkg.partslots?.length || 0);
    }
  }, [pkg, hasPreparedTiers, visiblePreparedTiers]);

  // ============================================================================
  // FALLBACK: Legacy client-side tier processing (when preparedTiers not available)
  // ============================================================================
  
  // Normalize partslots to handle API structure variations
  const normalizedPartslots = useMemo((): Partslot[] => {
    if (hasPreparedTiers || !pkg.partslots) return [];
    
    return pkg.partslots.map(slot => {
      const tiers = slot.products?.quality_tiers || 
                    (slot as any).quality_tiers || 
                    (slot as any).products || 
                    {};
      
      return {
        ...slot,
        products: { quality_tiers: tiers as QualityTiers }
      };
    });
  }, [pkg.partslots, hasPreparedTiers]);
  
  // Get the CARFIX Value (recommended) product for each partslot in a tier
  const getRecommendedPartsForTier = (tier: TierName): Part[] => {
    if (normalizedPartslots.length === 0) return [];
    
    return normalizedPartslots.map(slot => {
      const parts = slot.products?.quality_tiers?.[tier] || [];
      if (parts.length === 0) return null;
      
      // First check for CARFIX Value product
      const valueProduct = parts.find(p => pkg.carfixValueProducts?.includes(p.sku));
      if (valueProduct) return valueProduct;
      
      // Otherwise return cheapest product in this tier
      return parts.reduce((min, p) => p.price < min.price ? p : min, parts[0]);
    }).filter((p): p is Part => p !== null);
  };
  
  // Calculate tier total using recommended products (with rotor pair pricing)
  const getTierTotal = (tier: TierName): number => {
    return getRecommendedPartsForTier(tier).reduce((total, part) => {
      const isRotor = isRotorProduct(part);
      const { displayPrice } = getDisplayPrice(part.price, isRotor);
      return total + displayPrice;
    }, 0);
  };

  // Get unique brands for a tier (use full name when available)
  const getTierBrands = (tier: TierName): string[] => {
    const parts = getRecommendedPartsForTier(tier);
    const brands = [...new Set(parts.map(p => p.brand_full_name || p.brand))];
    return brands.slice(0, 3); // Max 3 brand logos on mobile
  };

  // Get parts count for tier
  const getTierPartCount = (tier: TierName): number => {
    return getRecommendedPartsForTier(tier).length;
  };

  // Get available tiers (ones that have parts)
  const availableTiers = useMemo(() => {
    return TIER_ORDER.filter(tier => {
      return normalizedPartslots.some(slot => {
        const parts = slot.products?.quality_tiers?.[tier];
        return parts && parts.length > 0;
      });
    });
  }, [normalizedPartslots]);

  // Tier deduplication - remove tiers with identical prices, keep higher priority
  const uniquePriceTiers = useMemo(() => {
    const tierPrices: Record<string, number> = {};
    availableTiers.forEach(tier => {
      tierPrices[tier] = getTierTotal(tier);
    });
    
    const seenPrices = new Map<number, string>();
    const uniqueTiers: string[] = [];
    
    // Process in priority order (Performance → Premium → Standard → Economy)
    const reversePriority = [...availableTiers].reverse();
    reversePriority.forEach(tier => {
      const price = tierPrices[tier];
      if (!seenPrices.has(price)) {
        seenPrices.set(price, tier);
        uniqueTiers.push(tier);
      }
    });
    
    // Return in standard order (Economy → Performance)
    return TIER_ORDER.filter(tier => uniqueTiers.includes(tier)) as TierName[];
  }, [availableTiers]);
  
  useEffect(() => {
    console.log('[ServicePackageDetailView] Available tiers:', availableTiers);
    console.log('[ServicePackageDetailView] Unique price tiers:', uniquePriceTiers);
  }, [availableTiers, uniquePriceTiers]);

  // Handle add to cart for a specific tier (legacy)
  const handleAddTierToCart = (tier: TierName) => {
    const parts = getRecommendedPartsForTier(tier);
    onAddToCart?.(parts);
  };
  
  // Handle add to cart using preparedTiers
  const handleAddPreparedTierToCart = (tier: PreparedTier) => {
    onAddToCart?.(tier.products);
  };

  // Get grid columns class based on tier count
  const getGridClass = (count: number) => {
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-3';
    return 'grid-cols-2';
  };

  // Get service package description
  const packageDescription = getServicePackageDescription(pkg.title);
  
  // Total parts count - use preparedTiers if available
  const totalPartsCount = hasPreparedTiers 
    ? (visiblePreparedTiers[0]?.productCount || 0)
    : normalizedPartslots.length;

  return (
    <div className="absolute inset-0 z-35 flex flex-col bg-[#FAFAFA] overflow-hidden">
      {/* Header with back button */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E2E8F0] bg-white shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[#0052CC] font-medium text-sm hover:text-[#0047B3] active:scale-95 transition-all"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Package Header - Gradient Background */}
        <div 
          className="px-4 pt-4 pb-4"
          style={{ background: 'linear-gradient(135deg, rgba(0,82,204,0.05) 0%, rgba(56,189,248,0.05) 100%)' }}
        >
          <div className="flex items-start gap-3">
            {/* Package Icon */}
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white shadow-md"
            >
              {pkg.icon_url ? (
                <img src={pkg.icon_url} alt="" className="w-8 h-8 object-contain" />
              ) : (
                <svg className="w-7 h-7 text-[#0052CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[#0F172A]">
                {pkg.title}
              </h1>
              
              {/* Time & Difficulty inline */}
              <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
                {pkg.estimated_time && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {pkg.estimated_time}
                  </span>
                )}
                {pkg.difficulty_level && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
                    </svg>
                    {pkg.difficulty_level}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Description - Problem → Benefit → CFX Pack */}
          <p className="text-sm text-[#64748B] mt-3 leading-relaxed">
            {packageDescription}
          </p>
        </div>

        {/* Choose Your Value Level Header */}
        <div className="px-4 py-3 flex items-center justify-center gap-2 border-b border-[#E2E8F0] bg-white">
          <span className="font-semibold text-[#0F172A] text-sm">Choose Your Value Level</span>
          <span className="text-[#64748B] text-xs cursor-help" title="Select the quality tier that suits your needs">ⓘ</span>
        </div>
        
        {/* Tier Selection Cards - Horizontal Grid */}
        <div className="p-4">
          {/* Use preparedTiers when available */}
          {hasPreparedTiers && visiblePreparedTiers.length > 0 ? (
            <div className={`grid ${getGridClass(visiblePreparedTiers.length)} gap-3`}>
              {visiblePreparedTiers.map(tier => {
                const tierConfig = QUALITY_TIER_CONFIG[tier.tierName as keyof typeof QUALITY_TIER_CONFIG];
                
                return (
                  <div
                    key={tier.tierName}
                    className="relative rounded-2xl overflow-hidden bg-white shadow-md flex flex-col"
                    style={{
                      border: tier.isRecommended ? '2px solid #0052CC' : '1px solid #E2E8F0',
                    }}
                  >
                    {/* RECOMMENDED badge */}
                    {tier.isRecommended && (
                      <div 
                        className="absolute top-0 left-0 right-0 px-2 py-1 text-[9px] font-bold text-white text-center"
                        style={{ background: 'linear-gradient(135deg, #0052CC 0%, #38BDF8 100%)' }}
                      >
                        ★ RECOMMENDED
                      </div>
                    )}
                    
                    <div className={`p-3 flex-1 flex flex-col ${tier.isRecommended ? 'pt-7' : ''}`}>
                      {/* Tier name with icon */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-lg">{tierConfig?.emoji}</span>
                        <div>
                          <span 
                            className="font-bold text-sm block"
                            style={{ color: tierConfig?.textColor || CARFIX_COLORS.foreground }}
                          >
                            {tier.displayName}
                          </span>
                          <span className="text-[10px] text-[#64748B] hidden md:block">
                            {tier.description || tierConfig?.description}
                          </span>
                        </div>
                      </div>
                      
                      {/* Brand logos - Use server-provided URLs directly */}
                      <div className="flex items-center gap-1.5 mb-3 min-h-[42px] flex-wrap">
                        {tier.brands.slice(0, 3).map((brand) => (
                          <div 
                            key={brand.name}
                            className="h-10 px-2 bg-white rounded-xl flex items-center justify-center shadow-md border border-[#F1F5F9]"
                          >
                            <img 
                              src={brand.imageUrl}
                              alt={brand.fullName}
                              className="h-6 w-auto object-contain"
                              onError={(e) => {
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  parent.innerHTML = `<span class="text-[10px] font-medium text-slate-700 px-1 truncate max-w-[60px]">${brand.name}</span>`;
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      
                      {/* Parts count - Use server-provided productCount */}
                      <p className="text-xs text-[#64748B] hidden md:block mb-2">
                        {tier.productCount} part{tier.productCount !== 1 ? 's' : ''} included
                      </p>
                      
                      {/* Price - Use server-provided totalPrice (includes rotor pair pricing) */}
                      <div className="mt-auto">
                        <p 
                          className="text-xl font-bold"
                          style={{ color: tier.isRecommended ? '#0052CC' : '#0F172A' }}
                        >
                          {formatNZD(tier.totalPrice)}
                        </p>
                        <p className="text-[10px] text-[#64748B] hidden md:block">inc GST</p>
                      </div>
                      
                      {/* Add to Cart button - SOLID, no glass */}
                      <button
                        onClick={() => handleAddPreparedTierToCart(tier)}
                        className={`mt-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5 ${
                          tier.isRecommended 
                            ? 'bg-[#0052CC] text-white shadow-md hover:bg-[#0047B3]' 
                            : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : uniquePriceTiers.length > 0 ? (
            /* FALLBACK: Legacy tier cards using client-side processing */
            <div className={`grid ${getGridClass(uniquePriceTiers.length)} gap-3`}>
              {uniquePriceTiers.map(tier => {
                const tierConfig = QUALITY_TIER_CONFIG[tier];
                const tierPrice = getTierTotal(tier);
                const tierBrands = getTierBrands(tier);
                const partCount = getTierPartCount(tier);
                const isRecommended = tierConfig.isRecommended || false;
                
                return (
                  <div
                    key={tier}
                    className="relative rounded-2xl overflow-hidden bg-white shadow-md flex flex-col"
                    style={{
                      border: isRecommended ? '2px solid #0052CC' : '1px solid #E2E8F0',
                    }}
                  >
                    {/* RECOMMENDED badge */}
                    {isRecommended && (
                      <div 
                        className="absolute top-0 left-0 right-0 px-2 py-1 text-[9px] font-bold text-white text-center"
                        style={{ background: 'linear-gradient(135deg, #0052CC 0%, #38BDF8 100%)' }}
                      >
                        ★ RECOMMENDED
                      </div>
                    )}
                    
                    <div className={`p-3 flex-1 flex flex-col ${isRecommended ? 'pt-7' : ''}`}>
                      {/* Tier name with icon */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-lg">{tierConfig.emoji}</span>
                        <div>
                          <span 
                            className="font-bold text-sm block"
                            style={{ color: tierConfig.textColor }}
                          >
                            {tier}
                          </span>
                          <span className="text-[10px] text-[#64748B] hidden md:block">
                            {tierConfig.description}
                          </span>
                        </div>
                      </div>
                      
                      {/* Brand logos - Fallback uses IMAGE_URLS */}
                      <div className="flex items-center gap-1.5 mb-3 min-h-[42px] flex-wrap">
                        {tierBrands.map((brand) => (
                          <div 
                            key={brand}
                            className="h-10 px-2 bg-white rounded-xl flex items-center justify-center shadow-md border border-[#F1F5F9]"
                          >
                            <img 
                              src={IMAGE_URLS.brandLogo(brand)}
                              alt={brand}
                              className="h-6 w-auto object-contain"
                              onError={(e) => {
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  parent.innerHTML = `<span class="text-[10px] font-medium text-slate-700 px-1 truncate max-w-[60px]">${brand}</span>`;
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      
                      {/* Parts count - desktop only */}
                      <p className="text-xs text-[#64748B] hidden md:block mb-2">
                        {partCount} part{partCount !== 1 ? 's' : ''} included
                      </p>
                      
                      {/* Price */}
                      <div className="mt-auto">
                        <p 
                          className="text-xl font-bold"
                          style={{ color: isRecommended ? '#0052CC' : '#0F172A' }}
                        >
                          {formatNZD(tierPrice)}
                        </p>
                        <p className="text-[10px] text-[#64748B] hidden md:block">inc GST</p>
                      </div>
                      
                      {/* Add to Cart button - SOLID, no glass */}
                      <button
                        onClick={() => handleAddTierToCart(tier)}
                        className={`mt-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5 ${
                          isRecommended 
                            ? 'bg-[#0052CC] text-white shadow-md hover:bg-[#0047B3]' 
                            : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Fallback UI when no tier data available */
            <div className="rounded-2xl p-5 bg-white border-2 border-[#0052CC] shadow-md">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#0052CC]">
                  {pkg.from_price > 0 ? formatNZD(pkg.from_price) : 'Price on request'}
                </p>
                <p className="text-xs text-[#64748B] mt-1">
                  {pkg.from_price > 0 ? 'Starting price inc GST' : 'Contact us for pricing'}
                </p>
              </div>
              
              {totalPartsCount > 0 && (
                <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                  <p className="text-xs text-[#64748B] text-center">
                    Includes {totalPartsCount} part{totalPartsCount !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              
              <button
                onClick={() => onAddToCart?.([])}
                className="w-full mt-4 px-4 py-3 rounded-xl text-sm font-semibold bg-[#0052CC] text-white hover:bg-[#0047B3] active:scale-95 transition-all shadow-md"
              >
                Contact for Details
              </button>
            </div>
          )}
        </div>

        {/* View Product Details - Collapsible Accordion (CLOSED by default) */}
        {uniquePriceTiers.length > 0 && (
          <div className="px-4 pb-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 transition-all shadow-sm"
            >
              <span className="text-sm font-medium text-[#0F172A]">
                {showDetails ? '▼' : '▶'} View Product Details
              </span>
              <span className="text-xs text-[#64748B]">
                {totalPartslots} product{totalPartslots !== 1 ? 's' : ''}
              </span>
            </button>
            
            {/* Expanded product details */}
            {showDetails && (
              <div className="mt-3 space-y-4 bg-white rounded-xl border border-[#E2E8F0] p-3">
                {uniquePriceTiers.map(tier => {
                  const parts = getRecommendedPartsForTier(tier);
                  if (parts.length === 0) return null;
                  const tierConfig = QUALITY_TIER_CONFIG[tier];
                  
                  return (
                    <div key={tier} className="space-y-2">
                      {/* Tier section header */}
                      <div className="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
                        <span className="text-lg">{tierConfig.emoji}</span>
                        <span 
                          className="font-semibold text-sm"
                          style={{ color: tierConfig.textColor }}
                        >
                          {tier}
                        </span>
                        <span className="text-xs text-[#64748B]">({parts.length} parts)</span>
                      </div>
                      
                      {/* Parts list */}
                      <div className="space-y-2">
                        {parts.map((part, idx) => {
                          const imageUrl = part.image_url || IMAGE_URLS.productImage(part.sku);
                          const isValueProduct = pkg.carfixValueProducts?.includes(part.sku);
                          const isRotor = isRotorProduct(part);
                          const { displayPrice, unitPriceLabel } = getDisplayPrice(part.price, isRotor);
                          const brandName = part.brand_full_name || part.brand;
                          
                          return (
                            <div
                              key={`${part.sku}-${idx}`}
                              className="flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-slate-50 cursor-pointer border border-[#E2E8F0]"
                              onClick={() => onNavigateToProductPage?.(part.sku)}
                            >
                              {/* Product image */}
                              <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-white overflow-hidden border border-[#E2E8F0]">
                                <img 
                                  src={imageUrl}
                                  alt={part.name}
                                  className="w-full h-full object-contain p-1.5"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                                  }}
                                />
                              </div>
                              
                              {/* Product info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-semibold text-[#0F172A]">{brandName}</span>
                                  {isValueProduct && (
                                    <span 
                                      className="px-1.5 py-0.5 text-[8px] font-bold rounded-full"
                                      style={{
                                        background: 'rgba(0, 82, 204, 0.1)',
                                        color: '#0052CC',
                                      }}
                                    >
                                      CFX VALUE
                                    </span>
                                  )}
                                  {isRotor && (
                                    <span 
                                      className="px-1.5 py-0.5 text-[8px] font-bold rounded-full"
                                      style={{
                                        background: '#EFF6FF',
                                        color: '#1D4ED8',
                                      }}
                                    >
                                      Pair
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[#64748B] line-clamp-1">{part.name}</p>
                              </div>
                              
                              {/* Price */}
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-bold text-[#0F172A]">{formatNZD(displayPrice)}</p>
                                {unitPriceLabel && (
                                  <p className="text-[10px] text-[#64748B]">{unitPriceLabel}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bundle Discount Badge */}
        {pkg.bundle_discount_percentage && pkg.bundle_discount_percentage > 0 && (
          <div className="px-4 pb-4">
            <div 
              className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <span className="text-sm font-semibold text-[#22C55E]">
                Bundle saves you {pkg.bundle_discount_percentage}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
