import React, { useRef, useEffect, useMemo, useState } from "react";
import { useViewportSize, type ViewportSize } from "../../hooks/useViewportSize";
import { usePositionFactors } from "../../hooks/usePositionFactors";
import { ProductTile } from "../ProductTile";
import type { Product, ServicePackage, PreparedTierProduct } from "../../types";
import type { HighlightedProduct } from "../../types/message";
import { isRearBrakePackage, filterByBrakeType, recalcTierTotal, type RearBrakeType } from "../../utils/rearBrakeFilter";
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
  viewportSize?: ViewportSize;
}> = ({ product, isSpotlighted, spotlightedRef, onProductClick }) => {
  // All viewports: Use ProductTile for consistent glassmorphism design
  return (
    <div ref={isSpotlighted ? spotlightedRef : undefined}>
      <ProductTile
        product={product}
        isSpotlighted={isSpotlighted}
        onProductClick={onProductClick}
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
        className={`absolute overflow-y-auto overflow-x-hidden flex flex-col gap-3 md:gap-4 transition-all duration-400 ease-out product-scroll ${
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

      {/* Loading state - Glass style */}
      {showLoading && (
        <div className="p-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0, 102, 204, 0.3)' }}>
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.8)', borderTopColor: 'transparent' }} />
            </div>
            <div>
              <p style={{ ...glassText.primary, fontWeight: 600, fontSize: '14px' }}>Searching shelves...</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '2px' }}>Finding the best parts for you</p>
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

      {/* Service Packages - CARFIX Tier Cards with Inline Accordion */}
      {/* Service Packages - CARFIX Tier Cards with Inline Accordion */}
      {showContent && servicePackages.length > 0 && (
        <div className="space-y-4">
          {servicePackages.map((pkg) => {
            // Use preparedTiers from server (no fallback needed - API always provides them)
            const isRearBrake = isRearBrakePackage(pkg);
            const brakeType = brakeTypes[pkg.id] || 'disc';
            let visibleTiers = (pkg.preparedTiers || []).filter(tier => !tier.isHidden);
            if (isRearBrake) {
              visibleTiers = visibleTiers.map(tier => {
                const filtered = filterByBrakeType(tier.products, brakeType);
                return { ...tier, products: filtered, totalPrice: recalcTierTotal(filtered), productCount: filtered.length };
              });
            }
            
            // Track selected tier for this package (default to recommended or first)
            const defaultTier = visibleTiers.find(t => t.isRecommended)?.tierName || visibleTiers[0]?.tierName || '';
            const selectedTierName = selectedTiers[pkg.id] || defaultTier;
            const selectedTier = visibleTiers.find(t => t.tierName === selectedTierName);
            
            // Get description
            const description = getServicePackageDescription(pkg.title);
            const shortDescription = description.split('.')[0] + '.';
            
            // Is this package expanded?
            const isExpanded = expandedPackageId === pkg.id;
            
            return (
              <div
                key={pkg.id}
                className="overflow-hidden transition-all duration-300"
                style={{
                  background: CARFIX_COLORS.card,
                  borderRadius: '16px',
                  border: `1px solid ${CARFIX_COLORS.border}`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                }}
              >
                {/* Package Header */}
                <div 
                  className="px-4 py-3"
                  style={{
                    background: `linear-gradient(135deg, ${CARFIX_COLORS.primary} 0%, ${CARFIX_COLORS.primaryHover} 100%)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-base leading-tight truncate">{pkg.title}</h3>
                      {pkg.estimated_time && (
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-white/70 text-xs flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {pkg.estimated_time}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Description */}
                <div className="px-4 py-3 border-b" style={{ borderColor: CARFIX_COLORS.border }}>
                  <p className="text-sm leading-relaxed" style={{ color: CARFIX_COLORS.mutedForeground }}>
                    {shortDescription}
                  </p>
                  
                  {/* Disc / Drum brake type toggle - only for Rear Brake Service */}
                  {isRearBrake && (
                    <div className="mt-2 mb-1">
                      <p className="text-[11px] mb-1.5" style={{ color: CARFIX_COLORS.mutedForeground }}>Select your vehicle's rear brake type</p>
                      <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: CARFIX_COLORS.border }}>
                        <button
                          onClick={() => setBrakeTypes(prev => ({ ...prev, [pkg.id]: 'disc' }))}
                          className="flex-1 py-2 px-3 text-xs font-semibold transition-all"
                          style={{
                            background: brakeType === 'disc' ? CARFIX_COLORS.primary : 'transparent',
                            color: brakeType === 'disc' ? '#FFFFFF' : CARFIX_COLORS.mutedForeground,
                          }}
                        >
                          Disc Brakes (Pads + Rotors)
                        </button>
                        <button
                          onClick={() => setBrakeTypes(prev => ({ ...prev, [pkg.id]: 'drum' }))}
                          className="flex-1 py-2 px-3 text-xs font-semibold transition-all"
                          style={{
                            background: brakeType === 'drum' ? CARFIX_COLORS.primary : 'transparent',
                            color: brakeType === 'drum' ? '#FFFFFF' : CARFIX_COLORS.mutedForeground,
                          }}
                        >
                          Drum Brakes (Shoes + Drums)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Tier Selection Cards - Vertical Brand Logo, Add to Cart per tier */}
                {visibleTiers.length > 0 && (
                  <div className="p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: CARFIX_COLORS.mutedForeground }}>
                      Choose Your Value Level
                    </p>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(visibleTiers.length, 4)}, 1fr)` }}>
                      {visibleTiers.map((tier) => {
                        const tierConfig = QUALITY_TIER_CONFIG[tier.tierName as keyof typeof QUALITY_TIER_CONFIG];
                        const isSelected = tier.tierName === selectedTierName;
                        
                        return (
                          <div
                            key={tier.tierName}
                            onClick={() => setSelectedTiers(prev => ({ ...prev, [pkg.id]: tier.tierName }))}
                            className="relative rounded-xl text-center transition-all cursor-pointer"
                            style={{
                              padding: visibleTiers.length >= 4 ? '6px 4px' : '8px',
                              background: tier.isRecommended 
                                ? `${CARFIX_COLORS.primary}10` 
                                : isSelected 
                                  ? `${CARFIX_COLORS.primary}05`
                                  : CARFIX_COLORS.background,
                              border: `2px solid ${
                                tier.isRecommended 
                                  ? CARFIX_COLORS.primary 
                                  : isSelected 
                                    ? CARFIX_COLORS.primary + '80'
                                    : CARFIX_COLORS.border
                              }`,
                            }}
                          >
                            {/* Carfix Value Badge */}
                            {tier.isRecommended && (
                              <div 
                                className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide whitespace-nowrap"
                                style={{ background: CARFIX_COLORS.primary, color: 'white' }}
                              >
                                Carfix Value
                              </div>
                            )}
                            
                            {/* Tier Name - Larger for readability */}
                            <p className="text-sm font-bold mt-1" style={{ color: tierConfig?.textColor || CARFIX_COLORS.foreground }}>
                              {tierConfig?.emoji} {tier.displayName}
                            </p>
                            
                            {/* Brand Logo - Single prominent logo with corrected URL fallback */}
                            <div className="flex flex-col items-center gap-1 mt-2" style={{ minHeight: visibleTiers.length >= 4 ? '40px' : '48px' }}>
                              {tier.brands.slice(0, 1).map((brand, idx) => {
                                // Construct corrected URL using fullName (removes spaces, adds .jpg)
                                const correctedImageUrl = `https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public/brand_images/${brand.fullName.replace(/\s+/g, '')}.jpg`;
                                
                                return (
                                  <div 
                                    key={idx}
                                    className="w-full bg-white rounded-lg flex items-center justify-center overflow-hidden"
                                    style={{ 
                                      height: visibleTiers.length >= 4 ? '36px' : '44px',
                                      maxWidth: visibleTiers.length >= 4 ? '64px' : '80px',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)', 
                                      border: '1px solid #F1F5F9' 
                                    }}
                                  >
                                    <img 
                                      src={brand.imageUrl}
                                      alt={brand.fullName}
                                      className="w-auto object-contain"
                                      style={{ height: visibleTiers.length >= 4 ? '26px' : '32px' }}
                                      onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        // Try corrected URL using fullName if different from current src
                                        if (img.src !== correctedImageUrl) {
                                          img.src = correctedImageUrl;
                                        } else {
                                          // If corrected URL also fails, show text fallback
                                          img.style.display = 'none';
                                          img.parentElement!.innerHTML = `<span class="text-[10px] font-semibold text-gray-600 truncate px-1">${brand.fullName}</span>`;
                                        }
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Parts Count - Slightly larger */}
                            <p className="text-[10px] mt-2" style={{ color: CARFIX_COLORS.mutedForeground }}>
                              {tier.productCount} {tier.productCount === 1 ? 'part' : 'parts'}
                            </p>
                            
                            {/* Price with bundle discount display */}
                            {tier.savingsAmount && tier.savingsAmount > 0 ? (
                              <>
                                <p className="text-[11px] line-through" style={{ color: CARFIX_COLORS.mutedForeground }}>
                                  {formatNZD(tier.originalTotalPrice!)}
                                </p>
                                <p className="text-base font-bold" style={{ color: CARFIX_COLORS.success }}>
                                  {formatNZD(tier.totalPrice)}
                                </p>
                                <p className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5" style={{ background: `${CARFIX_COLORS.success}15`, color: CARFIX_COLORS.success }}>
                                  SAVE {formatNZD(tier.savingsAmount)} — {tier.bundleDiscountPercentage}% Bundle Deal
                                </p>
                              </>
                            ) : (
                              <p className="text-base font-bold mt-1" style={{ color: CARFIX_COLORS.foreground }}>
                                {formatNZD(tier.totalPrice)}
                              </p>
                            )}
                            <p className="text-[10px]" style={{ color: CARFIX_COLORS.mutedForeground }}>inc GST</p>
                            
                            {/* Add to Cart button per tier */}
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
                                  sku: p.sku,
                                  partNumber: p.partNumber || undefined,
                                  image_url: p.productImageUrl,
                                  partslotDescription: p.partslotName,
                                  quantity: 1,
                                }));
                                onAddToCart?.(productsToAdd);
                              }}
                              className="w-full mt-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                              style={{
                                background: tier.isRecommended ? CARFIX_COLORS.success : '#F1F5F9',
                                color: tier.isRecommended ? 'white' : CARFIX_COLORS.success,
                                border: tier.isRecommended ? 'none' : '1px solid #E2E8F0',
                                textAlign: 'center',
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
                
                {/* Product Details Toggle - Minimal Chevron */}
                <div 
                  onClick={() => setExpandedPackageId(isExpanded ? null : pkg.id)}
                  className="flex items-center justify-center gap-1.5 py-2 cursor-pointer hover:bg-gray-50 transition-colors border-t"
                  style={{ borderColor: CARFIX_COLORS.border }}
                >
                  <span className="text-xs" style={{ color: CARFIX_COLORS.mutedForeground }}>
                    {isExpanded ? 'Hide details' : 'Show details'}
                  </span>
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    style={{ color: CARFIX_COLORS.mutedForeground }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                
                {/* Accordion Content - Products for Selected Tier */}
                {isExpanded && selectedTier && (
                  <div 
                    className="px-4 pb-4 border-t animate-in slide-in-from-top-2 duration-200"
                    style={{ borderColor: CARFIX_COLORS.border }}
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
                            {/* Product Image */}
                            <div className="w-14 h-14 flex-shrink-0 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                              {product.productImageUrl ? (
                                <img 
                                  src={product.productImageUrl} 
                                  alt={product.name}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              )}
                            </div>
                            
                            {/* Product Info */}
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
                              <p className="text-[10px] mt-0.5" style={{ color: CARFIX_COLORS.mutedForeground }}>
                                {product.partslotName}
                              </p>
                            </div>
                            
                            {/* Price */}
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
            
            {/* Products Grid - No wrapper padding */}
            <div className="flex flex-col gap-3">
              {groupProducts.map((product, index) => {
                const isSpotlighted = !!(highlightedProduct && productMatchesSpotlight(product, highlightedProduct));
                
                return (
                  <div key={`${product.id}-${index}`} data-testid="partslot-product">
                  <ResponsiveProductCard
                    product={product}
                    isSpotlighted={isSpotlighted}
                    spotlightedRef={spotlightedRef}
                    onProductClick={onProductClick}
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
