import React, { useState, useEffect, useMemo } from "react";
import { glassCard, glassText } from "../../styles/glass";
import { QUALITY_TIER_CONFIG, formatNZD, IMAGE_URLS, CARFIX_COLORS } from "../../styles/carfix-tokens";

// Extended types for service package detail
interface Part {
  sku: string;
  name: string;
  brand: string;
  price: number;
  is_on_sale?: boolean;
  sale_price?: number;
  was_price?: number;
  discount_percentage?: number;
  image_url?: string;
  part_number?: string;
  web_description?: string;
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
  icon_url?: string;
}

interface ServicePackageDetailViewProps {
  package: ServicePackageDetail;
  onBack: () => void;
  onAddToCart?: (parts: Part[]) => void;
  onNavigateToProductPage?: (sku: string) => void;
}

type TierName = 'Economy' | 'Standard' | 'Premium' | 'Performance';

const TIER_ORDER: TierName[] = ['Economy', 'Standard', 'Premium', 'Performance'];

// Tier icons and subtitles matching CARFIX website
const TIER_CONFIG: Record<TierName, { icon: string; subtitle: string }> = {
  Economy: { icon: '💰', subtitle: 'Budget option' },
  Standard: { icon: '⭐', subtitle: 'Best value' },
  Premium: { icon: '🏆', subtitle: 'Superior quality' },
  Performance: { icon: '⚡', subtitle: 'Maximum power' },
};

/**
 * ServicePackageDetailView - Full service package display within Bob widget
 * Matches CARFIX website design with card-based tier selection
 */
export const ServicePackageDetailView: React.FC<ServicePackageDetailViewProps> = ({
  package: pkg,
  onBack,
  onAddToCart,
  onNavigateToProductPage
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  // Debug logging to understand data structure
  useEffect(() => {
    console.log('[ServicePackageDetailView] Package:', pkg.title);
    console.log('[ServicePackageDetailView] from_price:', pkg.from_price);
    console.log('[ServicePackageDetailView] Partslots count:', pkg.partslots?.length || 0);
    if (pkg.partslots) {
      pkg.partslots.forEach((slot, idx) => {
        const tiers = slot.products?.quality_tiers || (slot as any).quality_tiers || {};
        console.log(`  [Partslot ${idx}] "${slot.name}":`, Object.keys(tiers), 
          'products:', Object.values(tiers).flat().length);
      });
    }
  }, [pkg]);

  // Normalize partslots to handle API structure variations
  const normalizedPartslots = useMemo((): Partslot[] => {
    if (!pkg.partslots) return [];
    
    return pkg.partslots.map(slot => {
      // Handle potential nested structures from API
      const tiers = slot.products?.quality_tiers || 
                    (slot as any).quality_tiers || 
                    (slot as any).products || 
                    {};
      
      return {
        ...slot,
        products: { quality_tiers: tiers as QualityTiers }
      };
    });
  }, [pkg.partslots]);
  
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
  
  // Calculate tier total using recommended products only
  const getTierTotal = (tier: TierName): number => {
    return getRecommendedPartsForTier(tier).reduce((total, part) => total + part.price, 0);
  };

  // Get unique brands for a tier
  const getTierBrands = (tier: TierName): string[] => {
    const parts = getRecommendedPartsForTier(tier);
    const brands = [...new Set(parts.map(p => p.brand))];
    return brands.slice(0, 3); // Max 3 brand logos
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
  
  // Debug available tiers
  useEffect(() => {
    console.log('[ServicePackageDetailView] Available tiers:', availableTiers);
  }, [availableTiers]);

  // Get tier styling
  const getTierStyle = (tier: TierName) => {
    const config = QUALITY_TIER_CONFIG[tier] || QUALITY_TIER_CONFIG.Standard;
    return {
      textColor: config.textColor,
      bg: config.background,
      border: config.border,
      isRecommended: (config as any).isRecommended || false,
    };
  };

  // Handle add to cart for a specific tier
  const handleAddTierToCart = (tier: TierName) => {
    const parts = getRecommendedPartsForTier(tier);
    onAddToCart?.(parts);
  };

  // Total partslot count - use normalized
  const totalPartslots = normalizedPartslots.length;

  return (
    <div className="absolute inset-0 z-35 flex flex-col bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-xl overflow-hidden">
      {/* Header with back button */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-slate-900/80 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-blue-400 font-medium text-sm hover:text-blue-300 active:scale-95 transition-all"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Package Header - CARFIX Style */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start gap-3">
            {/* Package Icon */}
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0, 82, 204, 0.2)' }}
            >
              {pkg.icon_url ? (
                <img src={pkg.icon_url} alt="" className="w-8 h-8 object-contain" />
              ) : (
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-xl font-bold text-white" style={glassText.primary}>
                  {pkg.title}
                </h1>
                <span className="text-sm text-white/50 flex-shrink-0">{totalPartslots} parts</span>
              </div>
              
              {/* Time & Difficulty inline */}
              <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
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
          
          {/* Description */}
          <p className="text-sm text-white/60 mt-3">{pkg.description}</p>
        </div>

        {/* CFX Value Level Section Header */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">Choose Your CFX Value Level</span>
            <span className="text-white/40 text-xs cursor-help" title="Choose your quality tier">ⓘ</span>
          </div>
        </div>
        
        {/* Tier Cards - CARFIX Style with brand logos */}
        <div className="px-4 pb-4 space-y-3">
          {availableTiers.length === 0 ? (
            /* Fallback UI when no tier data available */
            <div 
              className="rounded-2xl p-5"
              style={{ 
                background: 'rgba(255, 255, 255, 0.08)', 
                border: `2px solid ${CARFIX_COLORS.primary}` 
              }}
            >
              <div className="text-center">
                <p 
                  className="text-2xl font-bold"
                  style={{ color: CARFIX_COLORS.secondary }}
                >
                  {pkg.from_price > 0 ? formatNZD(pkg.from_price) : 'Price on request'}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  {pkg.from_price > 0 ? 'Starting price inc GST' : 'Contact us for pricing'}
                </p>
              </div>
              
              {/* Partslots preview if available */}
              {normalizedPartslots.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <p className="text-xs text-white/60 text-center">
                    Includes {normalizedPartslots.length} part{normalizedPartslots.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              
              <button
                onClick={() => onAddToCart?.([])}
                className="w-full mt-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${CARFIX_COLORS.accent} 0%, #E67E00 100%)`,
                  color: 'white',
                  boxShadow: '0 4px 14px rgba(255, 140, 0, 0.3)',
                }}
              >
                Contact for Details
              </button>
            </div>
          ) : (
            /* Regular tier cards */
            availableTiers.map(tier => {
              const tierStyle = getTierStyle(tier);
              const tierPrice = getTierTotal(tier);
              const tierBrands = getTierBrands(tier);
              const partCount = getTierPartCount(tier);
              const tierConfig = TIER_CONFIG[tier];
              
              return (
                <div
                  key={tier}
                  className="relative rounded-2xl overflow-hidden transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: `2px solid ${tierStyle.isRecommended ? CARFIX_COLORS.primary : 'rgba(255,255,255,0.15)'}`,
                  }}
                >
                  {/* RECOMMENDED badge */}
                  {tierStyle.isRecommended && (
                    <div 
                      className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold text-white rounded-bl-xl flex items-center gap-1"
                      style={{ background: CARFIX_COLORS.success }}
                    >
                      ★ RECOMMENDED
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      {/* Left side: tier info and brands */}
                      <div className="flex-1">
                        {/* Tier name and subtitle */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{tierConfig.icon}</span>
                          <div>
                            <span className="font-bold text-white text-base">{tier}</span>
                            <p className="text-xs text-white/50">{tierConfig.subtitle}</p>
                          </div>
                        </div>
                        
                        {/* Brand logos */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {tierBrands.map((brand) => (
                            <div 
                              key={brand}
                              className="h-8 px-2 bg-white rounded-lg flex items-center justify-center"
                            >
                              <img 
                                src={IMAGE_URLS.brandLogo(brand)}
                                alt={brand}
                                className="h-5 w-auto object-contain"
                                onError={(e) => {
                                  // Fallback to text if logo fails
                                  const parent = (e.target as HTMLImageElement).parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<span class="text-xs font-medium text-slate-700 px-1">${brand}</span>`;
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        
                        {/* Parts count */}
                        <p className="text-xs text-white/60 mt-2">
                          {partCount} part{partCount !== 1 ? 's' : ''} included
                        </p>
                      </div>
                      
                      {/* Right side: price and add to cart */}
                      <div className="text-right flex flex-col items-end gap-2">
                        <div>
                          <p 
                            className="text-2xl font-bold"
                            style={{ color: tierStyle.isRecommended ? CARFIX_COLORS.secondary : 'white' }}
                          >
                            {formatNZD(tierPrice)}
                          </p>
                          <p className="text-xs text-white/50">inc GST</p>
                        </div>
                        
                        {/* Add to Cart button */}
                        <button
                          onClick={() => handleAddTierToCart(tier)}
                          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                          style={{
                            background: tierStyle.isRecommended 
                              ? `linear-gradient(135deg, ${CARFIX_COLORS.accent} 0%, #E67E00 100%)`
                              : 'rgba(255,255,255,0.1)',
                            color: 'white',
                            boxShadow: tierStyle.isRecommended ? '0 4px 14px rgba(255, 140, 0, 0.3)' : 'none',
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* View Product Details - Expandable */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between p-3 rounded-xl transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <span className="text-sm font-medium text-white/80">View Product Details</span>
            <svg 
              className={`w-5 h-5 text-white/60 transition-transform ${showDetails ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Expanded product details */}
          {showDetails && (
            <div className="mt-3 space-y-4">
              {availableTiers.map(tier => {
                const parts = getRecommendedPartsForTier(tier);
                if (parts.length === 0) return null;
                
                return (
                  <div key={tier} className="space-y-2">
                    {/* Tier section header */}
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{TIER_CONFIG[tier].icon}</span>
                      <span className="font-semibold text-white text-sm">{tier}</span>
                      <span className="text-xs text-white/40">({parts.length} parts)</span>
                    </div>
                    
                    {/* Parts list */}
                    <div className="space-y-2 pl-7">
                      {parts.map((part, idx) => {
                        const imageUrl = part.image_url || IMAGE_URLS.productImage(part.sku);
                        const isValueProduct = pkg.carfixValueProducts?.includes(part.sku);
                        
                        return (
                          <div
                            key={`${part.sku}-${idx}`}
                            className="flex items-center gap-3 p-2.5 rounded-xl transition-all hover:scale-[1.01] cursor-pointer"
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                            onClick={() => onNavigateToProductPage?.(part.sku)}
                          >
                            {/* Product image */}
                            <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-white overflow-hidden">
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
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-white">{part.brand}</span>
                                {isValueProduct && (
                                  <span 
                                    className="px-1.5 py-0.5 text-[8px] font-bold rounded-full"
                                    style={{
                                      background: 'rgba(0, 82, 204, 0.2)',
                                      color: CARFIX_COLORS.secondary,
                                    }}
                                  >
                                    CFX VALUE
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-white/70 line-clamp-1">{part.name}</p>
                            </div>
                            
                            {/* Price */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-white">{formatNZD(part.price)}</p>
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
      </div>
    </div>
  );
};
