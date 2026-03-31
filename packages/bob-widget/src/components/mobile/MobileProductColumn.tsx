import React, { useRef, useEffect, useMemo, useState } from "react";
import { useViewportSize, type ViewportSize } from "../../hooks/useViewportSize";
import { usePositionFactors } from "../../hooks/usePositionFactors";
import { ProductTile } from "../ProductTile";
import type { Product, ServicePackage, PreparedTierProduct } from "../../types";
import type { HighlightedProduct } from "../../types/message";
import { isRearBrakePackage, filterByBrakeType, recalcTierTotal, detectAvailableBrakeTypes, type RearBrakeType } from "../../utils/rearBrakeFilter";
import { 
  glassCard, 
  glassCardPremium,
  glassPanel,
  glassButtonPrimary,
  glassText,
  glassScrollDot 
} from "../../styles/glass";
import {
  CARFIX_COLORS,
  QUALITY_TIER_CONFIG,
  getServicePackageDescription,
  IMAGE_URLS,
  formatNZD,
} from "../../styles/carfix-tokens";

// Variant card type for vehicle selection UI (matches backend structure)
export interface VariantCard {
  vehicle_id: number;
  optionNumber: number;
  displayTitle: string;
  displaySubtitle: string;
  characterization: string;
  kw?: number | null;
  cc?: number | null;
  ccDisplay?: string | null;
  fuelType?: string | null;
  engineCode?: string | null;
  make: string;
  model: string;
}

interface MobileProductColumnProps {
  products: Product[];
  servicePackages: ServicePackage[];
  highlightedPartType?: string | null;
  highlightedProduct?: HighlightedProduct | null;
  scrollToCategory?: string | null;
  onScrollToCategoryComplete?: () => void;
  onProductClick?: (product: Product) => void;
  onPackageSelect?: (pkg: ServicePackage) => void;
  isResearching?: boolean;
  visible?: boolean;
  counterHeightPercent?: number;
  hasVehicle?: boolean;
  onAddToCart?: (product: Product | Product[]) => void;
  /** Vehicle make and model for header display */
  vehicleMakeModel?: string;
  // NEW: Variant selection props
  pendingVariants?: VariantCard[];
  pendingVariantMake?: string;
  pendingVariantModel?: string;
  onVariantSelect?: (variant: VariantCard) => void;
}

const matchesPartType = (description: string, partType: string): boolean => {
  if (!description || !partType) return false;
  const desc = description.toLowerCase();
  const baseTerms = partType.toLowerCase()
    .replace(/s\b/g, '')
    .split(/\s+/)
    .filter(Boolean);
  return baseTerms.every(term => desc.includes(term));
};

const productMatchesSpotlight = (product: Product, spotlight: HighlightedProduct): boolean => {
  const brandMatch = product.brand?.toLowerCase() === spotlight.brand.toLowerCase();
  const priceMatch = Math.abs(product.price - spotlight.price) < 1;
  return brandMatch && priceMatch;
};

// =============================================================================
// PRODUCT CARD COMPONENTS - Different layouts for each viewport
// =============================================================================

/** Responsive Product Card - renders appropriate layout based on viewport */
const ResponsiveProductCard: React.FC<{
  product: Product;
  isSpotlighted: boolean;
  spotlightedRef?: React.RefObject<HTMLDivElement>;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  viewportSize?: ViewportSize;
}> = ({ product, isSpotlighted, spotlightedRef, onProductClick, onAddToCart }) => {
  // All viewports: Use ProductTile for consistent glassmorphism design
  return (
    <div ref={isSpotlighted ? spotlightedRef : undefined}>
      <ProductTile
        product={product}
        isSpotlighted={isSpotlighted}
        onProductClick={onProductClick}
        onAddToCart={onAddToCart}
      />
    </div>
  );
};

/** Spotlight Badge Component */

/** Spotlight Badge Component */
const SpotlightBadge: React.FC<{ variant?: 'default' | 'horizontal' }> = ({ variant = 'default' }) => (
  <span className={`absolute bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs px-2.5 py-1 rounded-full z-20 flex items-center gap-1 font-semibold shadow-md ${
    variant === 'horizontal' ? 'top-2 left-2' : 'top-3 right-3'
  }`}>
    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
    Bob's Pick
  </span>
);

/** No Image Placeholder */
const NoImagePlaceholder: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const iconClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };
  
  return (
    <div className="flex flex-col items-center justify-center text-gray-400">
      <svg className={iconClasses[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <span className="text-xs font-medium uppercase tracking-wide mt-1">No Image</span>
    </div>
  );
};

/** Fallback Image - tries product image, then brand logo, then NoImage placeholder */
const FallbackImage: React.FC<{ product: Product; className?: string }> = ({ product, className }) => {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const src = stage === 0 ? product.image_url : stage === 1 ? product.brandImageUrl : undefined;
  
  if (!src || stage >= 2) {
    return <NoImagePlaceholder size="md" />;
  }
  
  return (
    <img
      src={src}
      alt={product.name}
      className={className}
      onError={() => {
        if (stage === 0 && product.brandImageUrl) setStage(1);
        else setStage(2);
      }}
    />
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const MobileProductColumn: React.FC<MobileProductColumnProps> = ({
  products,
  servicePackages,
  highlightedPartType,
  highlightedProduct,
  scrollToCategory,
  onScrollToCategoryComplete,
  onProductClick,
  onPackageSelect,
  isResearching,
  visible = true,
  counterHeightPercent = 22,
  hasVehicle = false,
  onAddToCart,
  vehicleMakeModel,
  // NEW: Variant selection props
  pendingVariants,
  pendingVariantMake,
  pendingVariantModel,
  onVariantSelect
}) => {
  // v3.1.16: Display vehicle name or fallback
  const vehicleDisplayName = vehicleMakeModel || "Bob's Shelf";
  const viewportSize = useViewportSize();
  const factors = usePositionFactors();
  const scrollRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Record<string, HTMLElement | null>>({});
  const spotlightedRef = useRef<HTMLDivElement>(null);

  // Service package accordion state
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>({});
  const [brakeTypes, setBrakeTypes] = useState<Record<string, RearBrakeType>>({});
  
  // Full catalog display - no lazy loading, all products shown immediately
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    products.forEach(product => {
      const key = product.partslotDescription || 'Other Parts';
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    const sortedGroupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    return sortedGroupNames.map(name => ({ name, products: groups[name] }));
  }, [products]);

  // v3.2.1: Auto-scroll to highlighted partslot category when Bob mentions a part type
  useEffect(() => {
    if (!highlightedPartType) return;
    const timer = setTimeout(() => {
      const entries = Object.entries(groupRefs.current);
      for (const [name, el] of entries) {
        if (el && matchesPartType(name, highlightedPartType)) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightedPartType]);

  // v3.2.7: Auto-scroll to newly added category when follow-up parts arrive
  useEffect(() => {
    if (!scrollToCategory) return;
    const timer = setTimeout(() => {
      const entries = Object.entries(groupRefs.current);
      for (const [name, el] of entries) {
        if (el && matchesPartType(name, scrollToCategory)) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        }
      }
      onScrollToCategoryComplete?.();
    }, 300);
    return () => clearTimeout(timer);
  }, [scrollToCategory]);

  // Scroll tracking for custom indicator
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollHeight = target.scrollHeight - target.clientHeight;
    if (scrollHeight > 0) {
      const progress = target.scrollTop / scrollHeight;
      setScrollProgress(Math.max(0, Math.min(1, progress)));
    }
  };

  // Computed display states
  const hasVariants = (pendingVariants?.length ?? 0) > 0;
  const hasContent = products.length > 0 || servicePackages.length > 0 || hasVariants;
  const showLoading = isResearching && !hasContent;
  const showContent = hasContent && !showLoading;
  
  // Force visibility when products or variants exist
  const shouldBeVisible = visible || hasContent;
  
  // Layout calculations - MAXIMIZED for full screen utilization
  // v3.1.19: Desktop expanded to 70% width (was 48%) for more marketing real estate
  const columnWidth = viewportSize === 'mobile' ? 92 : viewportSize === 'tablet' ? 65 : 70;
  const maxWidth = viewportSize === 'desktop' ? '900px' : viewportSize === 'tablet' ? '500px' : '100%';
  // Mobile: Position shelf near top, below vehicle bar if present (not wasting 22vh)
  const topOffset = viewportSize === 'mobile' 
    ? `calc(8px + env(safe-area-inset-top, 4px))`
    : '6px';

  return (
    <>
      {/* Custom Scroll Indicator - Minimal glass dot on right edge */}
      {hasContent && visible && (
        <div 
          style={{
            position: 'fixed',
            right: '2px',
            top: `calc(${scrollProgress * 65 + 18}%)`,
            ...glassScrollDot,
            opacity: 0.8,
            transition: 'top 0.1s ease-out',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        />
      )}
      
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className={`absolute overflow-y-auto flex flex-col gap-3 md:gap-4 transition-all duration-400 ease-out product-scroll ${
          shouldBeVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12 pointer-events-none"
        }`}
        style={{
          // Right-aligned, responsive width
          width: `${columnWidth}%`,
          maxWidth: maxWidth,
          right: '0',
          left: 'auto',
          top: topOffset,
          bottom: viewportSize === 'mobile' 
            ? 'calc(100px + env(safe-area-inset-bottom, 0px))'  // v3.1.16: Reduced from 180px
            : '52px',
          paddingTop: '4px',
          paddingRight: '16px',
          paddingLeft: '16px',
          paddingBottom: '8px',
          // z-index 55: Below Bob (z-60) and counter (z-70) for visual layering
          // Touch still reaches here because Bob's wrapper has pointer-events: none
          zIndex: 55,
          pointerEvents: 'auto' as const,
          // Ensure touch scroll works on mobile - prevent scroll chaining to parent
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          // Hide default scrollbar
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
      {/* ============================================================================
          v3.0 SHELF HEADER - Premium Glass Style
          ============================================================================ */}
      <div 
        className="sticky top-0 z-10 -mx-1 px-3 py-2.5"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 102, 204, 0.85) 0%, rgba(0, 73, 153, 0.9) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '24px',
          boxShadow: '0 10px 40px rgba(0, 102, 204, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isResearching && hasContent ? (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}
            <span style={{ ...glassText.primary, fontWeight: 700, fontSize: '14px', letterSpacing: '0.025em' }}>
              {isResearching && hasContent ? 'Updating...' : vehicleDisplayName}
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 500 }}>
            {products.length + servicePackages.length} {(products.length + servicePackages.length) === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Loading state - Glass style - only shown when vehicle confirmed & parts incoming */}
      {showLoading && (
        <div className="p-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0, 102, 204, 0.3)' }}>
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.8)', borderTopColor: 'transparent' }} />
            </div>
            <div>
              <p style={{ ...glassText.primary, fontWeight: 600, fontSize: '14px' }}>Loading parts...</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '2px' }}>Bob's stocking the shelves</p>
            </div>
          </div>
        </div>
      )}
      
      {/* VARIANT SELECTION CARDS - Show when pending variants exist */}
      {hasVariants && pendingVariants && onVariantSelect && (
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div 
            className="sticky top-0 z-10 px-4 py-3"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 102, 204, 0.9) 0%, rgba(0, 73, 153, 0.95) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0, 102, 204, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-white font-semibold text-sm">Which {pendingVariantMake} {pendingVariantModel}?</span>
                <span className="text-white/70 text-xs block">Tap your variant to continue</span>
              </div>
            </div>
          </div>

          {/* Variant Cards */}
          <div className="flex flex-col gap-2 px-1">
            {(() => {
              // Pre-compute display labels and detect duplicates
              const labels = (pendingVariants || []).map((variant) => {
                const specsLine = [
                  variant.engineCode,
                  variant.kw ? `${variant.kw}kW` : null,
                  variant.ccDisplay || (variant.cc ? `${variant.cc}cc` : null),
                  variant.fuelType,
                ].filter(Boolean).join(' · ');
                return specsLine || variant.displayTitle;
              });
              
              // Find duplicates - if a label appears more than once, use displaySubtitle instead
              const labelCounts = labels.reduce((acc, label) => {
                acc[label] = (acc[label] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              
              return (pendingVariants || []).map((variant, index) => {
                const primaryLabel = labels[index];
                // If this label is a duplicate, use displaySubtitle (the full differentiating text from backend)
                const isDuplicate = labelCounts[primaryLabel] > 1;
                const displayLabel = isDuplicate && variant.displaySubtitle
                  ? variant.displaySubtitle
                  : primaryLabel;
                
                return (
                  <button
                    key={variant.vehicle_id}
                    type="button"
                    onClick={() => onVariantSelect(variant)}
                    className="w-full text-left transition-all duration-200 cursor-pointer rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.85) 100%)',
                      backdropFilter: 'blur(12px) saturate(150%)',
                      WebkitBackdropFilter: 'blur(12px) saturate(150%)',
                      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      minHeight: '72px',
                    }}
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-lg text-white"
                        style={{ background: 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)', boxShadow: '0 2px 8px rgba(0, 102, 204, 0.4)' }}
                      >
                        {variant.optionNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-base leading-tight">
                          {displayLabel}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(0, 102, 204, 0.1)' }}>
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}
      
      {/* Empty state - transparent */}
      {!showLoading && !hasContent && (
        <div className="p-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255, 149, 0, 0.3)' }}>
              <svg className="w-5 h-5" style={{ color: '#FF9500' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p style={{ ...glassText.primary, fontWeight: 600, fontSize: '14px' }}>No products to display</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '2px' }}>
                Products: {products.length} | Packages: {servicePackages.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Service Packages - Premium Tier Cards */}
      {showContent && servicePackages.length > 0 && (
        <div className="space-y-4">
          {servicePackages.map((pkg) => {
            const isRearBrake = isRearBrakePackage(pkg);
            const rawVisibleTiers = (pkg.preparedTiers || []).filter(tier => !tier.isHidden);
            
            const { hasDisc, hasDrum } = isRearBrake 
              ? detectAvailableBrakeTypes(rawVisibleTiers) 
              : { hasDisc: false, hasDrum: false };
            
            const effectiveBrakeType: RearBrakeType = 
              (isRearBrake && hasDisc && !hasDrum) ? 'disc' :
              (isRearBrake && hasDrum && !hasDisc) ? 'drum' :
              (brakeTypes[pkg.id] || 'disc');
            
            let visibleTiers = rawVisibleTiers;
            if (isRearBrake) {
              visibleTiers = rawVisibleTiers.map(tier => {
                const filtered = filterByBrakeType(tier.products, effectiveBrakeType);
                return { ...tier, products: filtered, totalPrice: recalcTierTotal(filtered), productCount: filtered.length };
              });
            }
            
            const defaultTier = visibleTiers.find(t => t.isRecommended)?.tierName || visibleTiers[0]?.tierName || '';
            const selectedTierName = selectedTiers[pkg.id] || defaultTier;
            const selectedTier = visibleTiers.find(t => t.tierName === selectedTierName);
            
            const description = getServicePackageDescription(pkg.title);
            const shortDescription = description.split('.')[0] + '.';
            
            const isExpanded = expandedPackageId === pkg.id;
            
            return (
              <div
                key={pkg.id}
                ref={(el) => { groupRefs.current[pkg.title] = el; }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  borderRadius: '20px',
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.95) 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                  border: '1px solid rgba(226,232,240,0.8)',
                }}
              >
                {/* Package Header - Clean gradient */}
                <div 
                  className="px-4 py-3.5"
                  style={{
                    background: `linear-gradient(135deg, ${CARFIX_COLORS.primary} 0%, #0066DD 100%)`,
                    borderRadius: '20px 20px 0 0',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-[15px] leading-tight truncate">{pkg.title}</h3>
                      {pkg.estimated_time && (
                        <span className="text-white/60 text-[11px] flex items-center gap-1 mt-0.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {pkg.estimated_time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Description - Concise */}
                <div className="px-4 py-2.5">
                  <p className="text-[12px] leading-relaxed" style={{ color: CARFIX_COLORS.mutedForeground }}>
                    {shortDescription}
                  </p>
                  
                  {/* Disc / Drum brake type toggle */}
                  {isRearBrake && hasDisc && hasDrum && (
                    <div className="mt-2">
                      <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${CARFIX_COLORS.border}` }}>
                        <button
                          onClick={() => setBrakeTypes(prev => ({ ...prev, [pkg.id]: 'disc' }))}
                          className="flex-1 py-1.5 px-3 text-[11px] font-semibold transition-all"
                          style={{
                            background: effectiveBrakeType === 'disc' ? CARFIX_COLORS.primary : 'transparent',
                            color: effectiveBrakeType === 'disc' ? '#FFFFFF' : CARFIX_COLORS.mutedForeground,
                          }}
                        >
                          Disc Brakes
                        </button>
                        <button
                          onClick={() => setBrakeTypes(prev => ({ ...prev, [pkg.id]: 'drum' }))}
                          className="flex-1 py-1.5 px-3 text-[11px] font-semibold transition-all"
                          style={{
                            background: effectiveBrakeType === 'drum' ? CARFIX_COLORS.primary : 'transparent',
                            color: effectiveBrakeType === 'drum' ? '#FFFFFF' : CARFIX_COLORS.mutedForeground,
                          }}
                        >
                          Drum Brakes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Tier Cards - Horizontal Scroll Snap */}
                {visibleTiers.length > 0 && (
                  <div className="pb-3">
                    <div 
                      className="flex gap-2.5 overflow-x-auto px-4 pb-2 snap-x snap-mandatory"
                      style={{ 
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                      }}
                    >
                      {visibleTiers.map((tier) => {
                        const tierConfig = QUALITY_TIER_CONFIG[tier.tierName as keyof typeof QUALITY_TIER_CONFIG];
                        const isSelected = tier.tierName === selectedTierName;
                        const hasSavings = tier.savingsAmount && tier.savingsAmount > 0;
                        
                        return (
                          <div
                            key={tier.tierName}
                            onClick={() => setSelectedTiers(prev => ({ ...prev, [pkg.id]: tier.tierName }))}
                            className="snap-start flex-shrink-0 cursor-pointer transition-all duration-200"
                            style={{
                              width: visibleTiers.length <= 2 ? '48%' : visibleTiers.length === 3 ? '38%' : '140px',
                              minWidth: '130px',
                              borderRadius: '16px',
                              padding: '12px 10px',
                              background: tier.isRecommended 
                                ? 'linear-gradient(145deg, rgba(0,82,204,0.06) 0%, rgba(56,189,248,0.06) 100%)' 
                                : isSelected 
                                  ? 'rgba(248,250,252,1)'
                                  : '#FFFFFF',
                              border: tier.isRecommended 
                                ? `2px solid ${CARFIX_COLORS.primary}` 
                                : isSelected 
                                  ? `2px solid ${CARFIX_COLORS.primary}60`
                                  : '1.5px solid #E2E8F0',
                              boxShadow: tier.isRecommended 
                                ? '0 4px 16px rgba(0,82,204,0.15)' 
                                : isSelected 
                                  ? '0 2px 12px rgba(0,0,0,0.06)' 
                                  : '0 1px 4px rgba(0,0,0,0.04)',
                              position: 'relative' as const,
                              display: 'flex',
                              flexDirection: 'column' as const,
                              alignItems: 'center',
                              textAlign: 'center' as const,
                            }}
                          >
                            {/* CARFIX Value badge - inline ribbon */}
                            {tier.isRecommended && (
                              <div 
                                style={{ 
                                  position: 'absolute' as const,
                                  top: '-1px',
                                  left: '-1px',
                                  right: '-1px',
                                  background: CARFIX_COLORS.primary,
                                  color: 'white',
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  letterSpacing: '0.05em',
                                  textAlign: 'center' as const,
                                  padding: '3px 0',
                                  borderRadius: '14px 14px 0 0',
                                }}
                              >
                                ★ CARFIX VALUE
                              </div>
                            )}
                            
                            {/* Tier icon + name */}
                            <div style={{ marginTop: tier.isRecommended ? '14px' : '0' }}>
                              <span style={{ fontSize: '20px' }}>{tierConfig?.emoji}</span>
                              <p 
                                style={{ 
                                  fontSize: '12px', 
                                  fontWeight: 700, 
                                  marginTop: '2px',
                                  color: tierConfig?.textColor || CARFIX_COLORS.foreground,
                                }}
                              >
                                {tier.displayName}
                              </p>
                            </div>
                            
                            {/* Brand Logo - single prominent */}
                            <div style={{ margin: '8px 0', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {tier.brands.slice(0, 1).map((brand, idx) => {
                                const correctedImageUrl = `${IMAGE_URLS.storageBase}/brand_images/${brand.fullName.replace(/\s+/g, '')}.jpg`;
                                return (
                                  <div 
                                    key={idx}
                                    style={{ 
                                      background: '#FFFFFF',
                                      borderRadius: '10px',
                                      padding: '4px 8px',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                      border: '1px solid #F1F5F9',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      height: '36px',
                                      maxWidth: '80px',
                                    }}
                                  >
                                    <img 
                                      src={brand.imageUrl}
                                      alt={brand.fullName}
                                      style={{ height: '24px', width: 'auto', objectFit: 'contain' as const }}
                                      onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        if (img.src !== correctedImageUrl) {
                                          img.src = correctedImageUrl;
                                        } else {
                                          img.style.display = 'none';
                                          img.parentElement!.innerHTML = `<span style="font-size:10px;font-weight:600;color:#475569">${brand.fullName}</span>`;
                                        }
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Parts count */}
                            <p style={{ fontSize: '10px', color: CARFIX_COLORS.mutedForeground }}>
                              {tier.productCount} {tier.productCount === 1 ? 'part' : 'parts'}
                            </p>
                            
                            {/* Price */}
                            <div style={{ marginTop: '6px' }}>
                              {hasSavings ? (
                                <>
                                  <p style={{ fontSize: '11px', textDecoration: 'line-through', color: '#94A3B8' }}>
                                    {formatNZD(tier.originalTotalPrice!)}
                                  </p>
                                  <p style={{ fontSize: '18px', fontWeight: 800, color: CARFIX_COLORS.success, letterSpacing: '-0.02em' }}>
                                    {formatNZD(tier.totalPrice)}
                                  </p>
                                  <p style={{ 
                                    fontSize: '9px', 
                                    fontWeight: 700, 
                                    color: CARFIX_COLORS.success, 
                                    background: `${CARFIX_COLORS.success}12`,
                                    padding: '2px 6px',
                                    borderRadius: '8px',
                                    marginTop: '2px',
                                  }}>
                                    SAVE {tier.bundleDiscountPercentage}%
                                  </p>
                                </>
                              ) : (
                                <p style={{ 
                                  fontSize: '18px', 
                                  fontWeight: 800, 
                                  color: tier.isRecommended ? CARFIX_COLORS.primary : CARFIX_COLORS.foreground,
                                  letterSpacing: '-0.02em',
                                }}>
                                  {formatNZD(tier.totalPrice)}
                                </p>
                              )}
                              <p style={{ fontSize: '9px', color: CARFIX_COLORS.mutedForeground, marginTop: '1px' }}>inc GST</p>
                            </div>
                            
                            {/* Add button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const discountPct = tier.bundleDiscountPercentage || 0;
                                const discountMultiplier = 1 - (discountPct / 100);
                                const productsToAdd: Product[] = tier.products.map(p => ({
                                  id: p.sku,
                                  name: p.name,
                                  brand: p.brand,
                                  price: discountPct > 0
                                    ? Math.round(p.displayPrice * discountMultiplier * 100) / 100
                                    : p.displayPrice,
                                  image_url: p.productImageUrl,
                                  brandImageUrl: p.brandImageUrl,
                                  sku: p.sku,
                                  partNumber: p.partNumber || undefined,
                                  partslotDescription: p.partslotName,
                                  quantity: 1,
                                  _bundleMeta: {
                                    is_bundle_item: true,
                                    bundle_discount_percentage: discountPct,
                                    service_package_name: pkg.title,
                                    service_package_id: pkg.id,
                                    quality_tier: tier.tierName,
                                  },
                                }));
                                onAddToCart?.(productsToAdd);
                              }}
                              style={{
                                marginTop: '8px',
                                width: '100%',
                                padding: '7px 0',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                transition: 'all 0.15s ease',
                                cursor: 'pointer',
                                border: 'none',
                                background: tier.isRecommended 
                                  ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' 
                                  : '#F1F5F9',
                                color: tier.isRecommended ? 'white' : CARFIX_COLORS.success,
                                boxShadow: tier.isRecommended ? '0 4px 12px rgba(34,197,94,0.3)' : 'none',
                              }}
                            >
                              Add
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Product Details Toggle */}
                <div 
                  onClick={() => setExpandedPackageId(isExpanded ? null : pkg.id)}
                  className="flex items-center justify-center gap-1.5 py-2 cursor-pointer transition-colors"
                  style={{ borderTop: `1px solid ${CARFIX_COLORS.border}` }}
                >
                  <span style={{ fontSize: '11px', color: CARFIX_COLORS.mutedForeground }}>
                    {isExpanded ? 'Hide details' : 'Show details'}
                  </span>
                  <svg 
                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                    style={{ width: '14px', height: '14px', color: CARFIX_COLORS.mutedForeground }}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Accordion Content - Products for Selected Tier */}
                {isExpanded && selectedTier && (
                  <div 
                    className="px-4 pb-4"
                    style={{ borderTop: `1px solid ${CARFIX_COLORS.border}` }}
                  >
                    <div className="pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: CARFIX_COLORS.mutedForeground }}>
                        {selectedTier.displayName} Tier Products
                      </p>
                      <div className="space-y-2">
                        {selectedTier.products.map((product) => (
                          <div 
                            key={product.sku}
                            className="flex items-center gap-3 p-2 rounded-lg"
                            style={{ background: CARFIX_COLORS.background, border: `1px solid ${CARFIX_COLORS.border}` }}
                          >
                            <div className="flex-shrink-0 bg-white rounded-lg overflow-hidden flex items-center justify-center" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                              {product.productImageUrl ? (
                                <img 
                                  src={product.productImageUrl} 
                                  alt={product.name}
                                  className="object-contain"
                                  style={{ width: '100%', height: '100%', padding: '4px' }}
                                />
                              ) : (
                                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: CARFIX_COLORS.foreground }}>
                                {product.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px]" style={{ color: CARFIX_COLORS.mutedForeground }}>
                                  {product.brand}
                                </span>
                                {product.isRotor && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                                    Pair
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold" style={{ color: CARFIX_COLORS.primary }}>
                                {formatNZD(product.displayPrice)}
                              </p>
                              {product.isRotor && (
                                <p className="text-[9px]" style={{ color: CARFIX_COLORS.mutedForeground }}>
                                  ${(product.price).toFixed(2)} ea
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Products - Grouped by part type with glass styling */}
      {showContent && groupedProducts.map(({ name, products: groupProducts }) => {
        const isHighlighted = highlightedPartType && matchesPartType(name, highlightedPartType);
        
        return (
          <section 
            key={name}
            ref={(el) => { groupRefs.current[name] = el; }}
            className="transition-all duration-300"
            style={{
              background: 'transparent',
              borderRadius: '24px',
            }}
          >
            {/* Section Header - Standalone blue pill */}
            <div 
              data-testid="partslot-header"
              data-partslot-name={name}
              className="px-3 py-2.5 flex items-center justify-between"
              style={{
                background: isHighlighted 
                  ? 'rgba(0, 102, 204, 0.95)'
                  : 'rgba(0, 51, 102, 0.9)',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                marginBottom: '8px',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isHighlighted 
                      ? 'linear-gradient(135deg, rgba(0, 102, 204, 0.9) 0%, rgba(0, 73, 153, 1) 100%)'
                      : 'rgba(255,255,255,0.2)',
                  }}
                >
                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span 
                  className="text-xs font-bold truncate uppercase tracking-wide"
                  style={{ 
                    color: 'white',
                    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                  }}
                >
                  {name}
                </span>
              </div>
              <span 
                className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{
                  background: 'rgba(255, 149, 0, 0.9)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(255, 149, 0, 0.4)',
                }}
              >
                {groupProducts.length}
              </span>
            </div>
            
            {/* Products Row - Horizontal scroll-snap */}
            <div 
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <style>{`.product-scroll-row::-webkit-scrollbar { display: none; }`}</style>
              {groupProducts.map((product, index) => {
                const isSpotlighted = !!(highlightedProduct && productMatchesSpotlight(product, highlightedProduct));
                
                return (
                  <div 
                    key={`${product.id}-${index}`} 
                    data-testid="partslot-product"
                    className="snap-start flex-shrink-0"
                    style={{
                      width: viewportSize === 'desktop' ? '32%' : viewportSize === 'tablet' ? '45%' : '75%',
                    }}
                  >
                    <ResponsiveProductCard
                      product={product}
                      isSpotlighted={isSpotlighted}
                      spotlightedRef={spotlightedRef}
                      onProductClick={onProductClick}
                      onAddToCart={onAddToCart}
                      viewportSize={viewportSize}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      
      
      {/* Bottom padding for scroll */}
      <div className="h-4" />
    </div>
    </>
  );
};
