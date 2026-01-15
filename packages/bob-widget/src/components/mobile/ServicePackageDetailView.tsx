import React, { useState } from "react";
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

// Tier icons matching CARFIX website
const TIER_ICONS: Record<TierName, string> = {
  Economy: '💰',
  Standard: '⭐',
  Premium: '🏆',
  Performance: '⚡',
};

/**
 * ServicePackageDetailView - Full service package display within Bob widget
 * Matches CARFIX website design exactly
 */
export const ServicePackageDetailView: React.FC<ServicePackageDetailViewProps> = ({
  package: pkg,
  onBack,
  onAddToCart,
  onNavigateToProductPage
}) => {
  const [selectedTier, setSelectedTier] = useState<TierName>('Standard');
  
  // Calculate tier totals
  const getTierTotal = (tier: TierName): number => {
    if (!pkg.partslots) return 0;
    return pkg.partslots.reduce((total, slot) => {
      const parts = slot.products?.quality_tiers?.[tier] || [];
      if (parts.length === 0) return total;
      // Use the first (cheapest) part from each slot
      const cheapest = parts.reduce((min, p) => p.price < min.price ? p : min, parts[0]);
      return total + (cheapest?.price || 0);
    }, 0);
  };

  // Get available tiers (ones that have parts)
  const availableTiers = TIER_ORDER.filter(tier => {
    if (!pkg.partslots) return false;
    return pkg.partslots.some(slot => {
      const parts = slot.products?.quality_tiers?.[tier];
      return parts && parts.length > 0;
    });
  });

  // Get parts for selected tier grouped by partslot
  const getPartsForTier = (tier: TierName): { slot: Partslot; parts: Part[] }[] => {
    if (!pkg.partslots) return [];
    return pkg.partslots
      .map(slot => ({
        slot,
        parts: slot.products?.quality_tiers?.[tier] || []
      }))
      .filter(({ parts }) => parts.length > 0);
  };

  const tierParts = getPartsForTier(selectedTier);
  const tierTotal = getTierTotal(selectedTier);
  const partCount = tierParts.reduce((count, { parts }) => count + parts.length, 0);

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

  // Check if a partslot has a CARFIX Value product
  const slotHasValueProduct = (parts: Part[]): boolean => {
    return parts.some(part => pkg.carfixValueProducts?.includes(part.sku));
  };

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
              <span className="text-sm text-white/50 flex-shrink-0">{partCount} parts</span>
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

      {/* CFX Value Level Section */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-semibold text-white text-sm">CFX Value Level</span>
          <span className="text-white/40 text-xs cursor-help" title="Choose your quality tier">ⓘ</span>
        </div>
        
        {/* Tier Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {availableTiers.map(tier => {
            const tierStyle = getTierStyle(tier);
            const tierPrice = getTierTotal(tier);
            const isSelected = selectedTier === tier;
            
            return (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`
                  relative p-3 rounded-xl text-left transition-all
                  ${isSelected 
                    ? 'ring-2 ring-blue-400 scale-[1.02]' 
                    : 'opacity-80 hover:opacity-100'
                  }
                `}
                style={{
                  background: isSelected ? 'rgba(0, 82, 204, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: `2px solid ${isSelected ? tierStyle.border : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {/* RECOMMENDED badge for Standard */}
                {tierStyle.isRecommended && (
                  <span 
                    className="absolute -top-2.5 left-3 px-2 py-0.5 text-[9px] font-bold text-white rounded-full flex items-center gap-0.5"
                    style={{ background: CARFIX_COLORS.success }}
                  >
                    ★ RECOMMENDED
                  </span>
                )}
                
                <div className="flex items-center gap-2">
                  <span className="text-lg">{TIER_ICONS[tier]}</span>
                  <span className="font-medium text-white text-sm">{tier}</span>
                </div>
                <p 
                  className="text-lg font-bold mt-1.5"
                  style={{ color: isSelected ? CARFIX_COLORS.secondary : tierStyle.textColor }}
                >
                  {formatNZD(tierPrice)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parts List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {tierParts.map(({ slot, parts }) => {
          const hasValueProduct = slotHasValueProduct(parts);
          
          return (
            <div key={slot.id}>
              {/* Partslot Header with CARFIX Value badge */}
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-sm font-semibold text-white uppercase tracking-wide">
                  {slot.name}
                </span>
                {hasValueProduct && (
                  <span 
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-full flex items-center gap-1"
                    style={{
                      background: 'rgba(0, 82, 204, 0.2)',
                      color: CARFIX_COLORS.secondary,
                      border: '1px solid rgba(0, 82, 204, 0.3)',
                    }}
                  >
                    ✨ CARFIX Value
                  </span>
                )}
              </div>
              
              {/* Parts in this slot */}
              <div className="space-y-2.5">
                {parts.map((part, idx) => {
                  const isValueProduct = pkg.carfixValueProducts?.includes(part.sku);
                  const imageUrl = part.image_url || IMAGE_URLS.productImage(part.sku);
                  const brandLogoUrl = IMAGE_URLS.brandLogo(part.brand);
                  
                  return (
                    <div
                      key={`${part.sku}-${idx}`}
                      className="rounded-xl p-3.5 transition-all hover:scale-[1.01] cursor-pointer"
                      style={{
                        ...glassCard,
                        background: 'rgba(255, 255, 255, 0.06)',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                      }}
                      onClick={() => onNavigateToProductPage?.(part.sku)}
                    >
                      <div className="flex gap-3.5">
                        {/* Product Image - Larger */}
                        <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-white overflow-hidden">
                          <img 
                            src={imageUrl}
                            alt={part.name}
                            className="w-full h-full object-contain p-2"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          {/* Brand with logo */}
                          <div className="flex items-center gap-2 mb-1">
                            <img 
                              src={brandLogoUrl}
                              alt={part.brand}
                              className="h-4 w-auto object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <span className="text-sm font-bold text-white">{part.brand}</span>
                          </div>
                          
                          {/* Product name */}
                          <p className="text-sm text-white/80 line-clamp-2 leading-snug">
                            {part.name}
                          </p>
                          
                          {/* Price and badges row */}
                          <div className="flex items-end justify-between mt-2.5">
                            {/* Fits Your Vehicle badge */}
                            <div 
                              className="px-2 py-1.5 rounded-lg text-center"
                              style={{
                                background: 'rgba(34, 197, 94, 0.15)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                              }}
                            >
                              <p 
                                className="text-[9px] font-semibold leading-tight"
                                style={{ color: CARFIX_COLORS.success }}
                              >
                                Fits<br/>Your<br/>Vehicle
                              </p>
                            </div>
                            
                            {/* Price */}
                            <div className="text-right">
                              {part.is_on_sale && part.was_price ? (
                                <>
                                  <p 
                                    className="text-lg font-bold"
                                    style={{ color: CARFIX_COLORS.success }}
                                  >
                                    {formatNZD(part.sale_price || part.price)}
                                  </p>
                                  <p className="text-xs text-white/40 line-through">
                                    {formatNZD(part.was_price)}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-lg font-bold text-white">
                                    {formatNZD(part.price)}
                                  </p>
                                  <p className="text-[10px] text-white/50">inc GST</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        {/* Empty state */}
        {tierParts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/50 text-sm">No parts available in this tier</p>
          </div>
        )}
      </div>

      {/* Fixed bottom action - CARFIX Style */}
      <div className="p-4 border-t border-white/10 bg-slate-900/95 backdrop-blur-sm space-y-3">
        {/* Total row */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">Total</span>
          <div className="flex items-baseline gap-1">
            <span 
              className="text-xl font-bold"
              style={{ color: CARFIX_COLORS.secondary }}
            >
              {formatNZD(tierTotal)}
            </span>
            <span className="text-xs text-white/50">inc GST</span>
          </div>
        </div>
        
        {/* Orange Add to Cart button */}
        <button
          onClick={() => {
            const allParts = tierParts.flatMap(({ parts }) => parts);
            onAddToCart?.(allParts);
          }}
          className="w-full flex items-center justify-center gap-2 text-white text-base font-semibold py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${CARFIX_COLORS.accent} 0%, #E67E00 100%)`,
            boxShadow: '0 4px 14px rgba(255, 140, 0, 0.3)',
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Add All {partCount} Parts to Cart
        </button>
      </div>
    </div>
  );
};
