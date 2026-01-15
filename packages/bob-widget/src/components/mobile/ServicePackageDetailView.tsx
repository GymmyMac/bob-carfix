import React, { useState } from "react";
import { glassCard, glassButtonBlue, glassText, glassBadge } from "../../styles/glass";
import { QUALITY_TIER_CONFIG, formatNZD, IMAGE_URLS } from "../../styles/carfix-tokens";

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

/**
 * ServicePackageDetailView - Full service package display within Bob widget
 * Shows quality tier tabs, parts list, and pricing matching CARFIX website design
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
  const isCarfixValue = pkg.carfixValueTier === selectedTier;

  // Get tier styling
  const getTierStyle = (tier: TierName) => {
    const config = QUALITY_TIER_CONFIG[tier] || QUALITY_TIER_CONFIG.Standard;
    return config;
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
          Back to Products
        </button>
      </div>

      {/* Package Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-white mb-1" style={glassText.primary}>
          {pkg.title}
        </h1>
        <p className="text-sm text-white/70">{pkg.description}</p>
        
        {/* Info badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {pkg.estimated_time && (
            <span 
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white/90 rounded-full"
              style={glassBadge}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {pkg.estimated_time}
            </span>
          )}
          {pkg.difficulty_level && (
            <span 
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white/90 rounded-full"
              style={glassBadge}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {pkg.difficulty_level}
            </span>
          )}
          {pkg.bundle_discount_percentage && pkg.bundle_discount_percentage > 0 && (
            <span 
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-300 rounded-full"
              style={{ ...glassBadge, borderColor: 'rgba(134, 239, 172, 0.3)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {pkg.bundle_discount_percentage}% Bundle Discount
            </span>
          )}
        </div>
      </div>

      {/* Quality Tier Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {availableTiers.map(tier => {
            const tierStyle = getTierStyle(tier);
            const tierPrice = getTierTotal(tier);
            const isSelected = selectedTier === tier;
            const isValue = pkg.carfixValueTier === tier;
            
            return (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`
                  flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl transition-all
                  ${isSelected 
                    ? 'ring-2 ring-white/40 scale-105' 
                    : 'opacity-70 hover:opacity-100'
                  }
                `}
                style={{
                  background: tierStyle.bg,
                  border: `1px solid ${tierStyle.border}`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{tierStyle.icon}</span>
                  <span className="text-xs font-semibold" style={{ color: tierStyle.text }}>
                    {tier}
                  </span>
                  {isValue && (
                    <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                      VALUE
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold mt-0.5" style={{ color: tierStyle.text }}>
                  {formatNZD(tierPrice)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CARFIX Value Banner */}
      {isCarfixValue && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600/30 to-blue-500/20 border border-blue-400/30">
          <div className="flex items-center gap-2">
            <span className="text-blue-300 text-sm">✨</span>
            <span className="text-blue-200 text-xs font-medium">
              CARFIX Value Pick - Best balance of quality and price
            </span>
          </div>
        </div>
      )}

      {/* Parts List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {tierParts.map(({ slot, parts }) => (
          <div key={slot.id}>
            {/* Partslot Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-white/90">{slot.name}</span>
              {slot.description && (
                <span className="text-xs text-white/50">({slot.description})</span>
              )}
            </div>
            
            {/* Parts in this slot */}
            <div className="space-y-2">
              {parts.map((part, idx) => {
                const isValueProduct = pkg.carfixValueProducts?.includes(part.sku);
                const imageUrl = part.image_url || IMAGE_URLS.product(part.sku);
                
                return (
                  <div
                    key={`${part.sku}-${idx}`}
                    className="rounded-xl p-3 transition-all hover:scale-[1.02]"
                    style={glassCard}
                    onClick={() => onNavigateToProductPage?.(part.sku)}
                  >
                    <div className="flex gap-3">
                      {/* Product Image */}
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-white/10 overflow-hidden">
                        <img 
                          src={imageUrl}
                          alt={part.name}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {part.name}
                            </p>
                            <p className="text-xs text-white/60 mt-0.5">{part.brand}</p>
                          </div>
                          
                          {/* Price */}
                          <div className="text-right flex-shrink-0">
                            {part.is_on_sale && part.was_price ? (
                              <>
                                <p className="text-sm font-bold text-green-400">
                                  {formatNZD(part.sale_price || part.price)}
                                </p>
                                <p className="text-xs text-white/40 line-through">
                                  {formatNZD(part.was_price)}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm font-bold" style={glassText.price}>
                                {formatNZD(part.price)}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Badges */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {isValueProduct && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/30 text-blue-200 rounded-md border border-blue-400/30">
                              ✨ CARFIX Value
                            </span>
                          )}
                          {part.is_on_sale && part.discount_percentage && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-red-500/30 text-red-200 rounded-md border border-red-400/30">
                              {part.discount_percentage}% OFF
                            </span>
                          )}
                          {part.classification?.display_name && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-white/10 text-white/70 rounded-md">
                              {part.classification.display_name}
                            </span>
                          )}
                        </div>
                        
                        {/* SKU */}
                        {part.sku && (
                          <p className="text-[10px] text-white/40 mt-1.5">
                            SKU: {part.sku}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {/* Empty state */}
        {tierParts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/50 text-sm">No parts available in this tier</p>
          </div>
        )}
      </div>

      {/* Fixed bottom action */}
      <div className="p-4 border-t border-white/10 bg-slate-900/95 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white/70">Package Total ({selectedTier})</span>
          <span className="text-xl font-bold" style={glassText.price}>
            {formatNZD(tierTotal)}
          </span>
        </div>
        <button
          onClick={() => {
            const allParts = tierParts.flatMap(({ parts }) => parts);
            onAddToCart?.(allParts);
          }}
          className="w-full text-white text-base font-semibold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={glassButtonBlue}
        >
          Add {selectedTier} Package to Cart
        </button>
      </div>
    </div>
  );
};
