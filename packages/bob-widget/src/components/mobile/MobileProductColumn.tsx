import React, { useRef, useEffect, useMemo, useState } from "react";
import { useViewportSize, type ViewportSize } from "../../hooks/useViewportSize";
import { usePositionFactors } from "../../hooks/usePositionFactors";
import { ProductTile } from "../ProductTile";
import type { Product, ServicePackage } from "../../types";
import type { HighlightedProduct } from "../../types/message";
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
} from "../../styles/carfix-tokens";

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
  onAddToCart?: (product: Product) => void;
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
  viewportSize: ViewportSize;
}> = ({ product, isSpotlighted, spotlightedRef, onProductClick, viewportSize }) => {
  // Desktop: Premium horizontal layout
  if (viewportSize === 'desktop') {
    return (
      <div 
        ref={isSpotlighted ? spotlightedRef : undefined}
        onClick={() => onProductClick?.(product)}
        className={`flex flex-row cursor-pointer transition-all duration-300 bg-white rounded-2xl border relative overflow-hidden hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-0.5 group ${
          isSpotlighted 
            ? "ring-2 ring-blue-500 shadow-xl border-blue-200" 
            : "border-gray-100 shadow-lg"
        }`}
        style={{ minHeight: '140px' }}
      >
        {isSpotlighted && <SpotlightBadge variant="horizontal" />}
        
        <div className="w-36 shrink-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <NoImagePlaceholder size="lg" />
          )}
        </div>
        
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <p className="text-base font-semibold text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-700 transition-colors">{product.name}</p>
            {product.brand && (
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {product.brand}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between gap-3">
            <span className="text-2xl font-bold text-blue-600">
              {product.price > 0 ? `$${product.price.toFixed(2)}` : 'POA'}
            </span>
            <button 
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                onProductClick?.(product);
              }}
            >
              View
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tablet: Medium vertical card
  if (viewportSize === 'tablet') {
    return (
      <div 
        ref={isSpotlighted ? spotlightedRef : undefined}
        onClick={() => onProductClick?.(product)}
        className={`cursor-pointer transition-all duration-300 bg-white rounded-2xl border relative overflow-hidden hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 ${
          isSpotlighted 
            ? "ring-2 ring-blue-500 shadow-xl border-blue-200" 
            : "border-gray-100 shadow-lg"
        }`}
      >
        {isSpotlighted && <SpotlightBadge />}
        
        <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-4" />
          ) : (
            <NoImagePlaceholder size="md" />
          )}
        </div>
        
        <div className="p-4">
          <p className="text-base font-semibold text-gray-900 line-clamp-2 mb-1">{product.name}</p>
          {product.brand && (
            <p className="text-sm text-gray-600 font-medium mb-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              {product.brand}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-blue-600">
              {product.price > 0 ? `$${product.price.toFixed(2)}` : 'POA'}
            </span>
          </div>
          
          <button 
            className="mt-3 w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl hover:from-blue-700 hover:to-blue-600 active:from-blue-800 active:to-blue-700 transition-all shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              onProductClick?.(product);
            }}
          >
            View Details
          </button>
        </div>
      </div>
    );
  }

  // Mobile: Use new ProductTile component for full-width translucent design
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
  onAddToCart
}) => {
  const viewportSize = useViewportSize();
  const factors = usePositionFactors();
  const scrollRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Record<string, HTMLElement | null>>({});
  const spotlightedRef = useRef<HTMLDivElement>(null);

  // Lazy loading state - initially show first batch, load more on scroll
  const INITIAL_BATCH_SIZE = 30;
  const LOAD_MORE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Reset visible count when products change
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [products.length]);
  
  // Intersection observer for lazy loading
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < products.length) {
          setVisibleCount(prev => Math.min(prev + LOAD_MORE_SIZE, products.length));
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [visibleCount, products.length]);
  
  // Get visible products for current scroll position
  const visibleProducts = useMemo(() => products.slice(0, visibleCount), [products, visibleCount]);
  
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    
    visibleProducts.forEach(product => {
      const key = product.partslotDescription || 'Other Parts';
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    
    const sortedGroupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    return sortedGroupNames.map(name => ({ name, products: groups[name] }));
  }, [visibleProducts]);

  useEffect(() => {
    if (highlightedPartType) {
      const matchingGroup = groupedProducts.find(g => matchesPartType(g.name, highlightedPartType));
      if (matchingGroup && groupRefs.current[matchingGroup.name]) {
        groupRefs.current[matchingGroup.name]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [highlightedPartType, groupedProducts]);

  useEffect(() => {
    if (highlightedProduct && spotlightedRef.current) {
      spotlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedProduct]);

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
  const hasContent = products.length > 0 || servicePackages.length > 0;
  const showLoading = isResearching && !hasContent;
  const showContent = hasContent && !showLoading;
  
  // Force visibility when products exist (prevents animation state blocking display)
  const shouldBeVisible = visible || hasContent;
  
  // Layout calculations - MAXIMIZED for full screen utilization
  const columnWidth = viewportSize === 'mobile' ? 88 : viewportSize === 'tablet' ? 58 : 48;
  const maxWidth = viewportSize === 'desktop' ? '580px' : viewportSize === 'tablet' ? '500px' : '100%';
  // Mobile: Position shelf near top, below vehicle bar if present (not wasting 22vh)
  const topOffset = viewportSize === 'mobile' 
    ? `calc(${hasVehicle ? '56px' : '8px'} + env(safe-area-inset-top, 4px))`
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
        className={`absolute overflow-y-auto overflow-x-hidden z-30 flex flex-col gap-3 md:gap-4 transition-all duration-400 ease-out product-scroll ${
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
            ? 'calc(58px + env(safe-area-inset-bottom, 0px))' 
            : '52px',
          paddingTop: '4px',
          paddingRight: '6px',
          paddingLeft: '12px',
          paddingBottom: '8px',
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
              {isResearching && hasContent ? 'Updating...' : "Bob's Shelf"}
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 500 }}>
            {products.length + servicePackages.length} {(products.length + servicePackages.length) === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Loading state - Glass style */}
      {showLoading && (
        <div 
          className="p-5"
          style={{
            ...glassCard,
          }}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0, 102, 204, 0.2)' }}>
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.8)', borderTopColor: 'transparent' }} />
            </div>
            <div>
              <p style={{ ...glassText.primary, fontWeight: 600, fontSize: '14px' }}>Searching shelves...</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '2px' }}>Finding the best parts for you</p>
            </div>
          </div>
        </div>
      )}
      
      {/* DEBUG: Empty state with glass style */}
      {!showLoading && !hasContent && (
        <div 
          className="p-5"
          style={{
            ...glassCard,
            background: 'rgba(255, 149, 0, 0.15)',
          }}
        >
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

      {/* Service Packages - CARFIX Tier Preview Cards */}
      {showContent && servicePackages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div 
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${CARFIX_COLORS.primary} 0%, ${CARFIX_COLORS.primaryHover} 100%)`,
                boxShadow: `0 4px 12px ${CARFIX_COLORS.primary}66`,
              }}
            >
              <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
              CFX Service Packs
            </span>
          </div>
          {servicePackages.map((pkg) => {
            // Extract available tiers from package
            const availableTiers: string[] = [];
            const tierPrices: Record<string, number> = {};
            const tierBrands: Record<string, string[]> = {};
            
            if (pkg.partslots && Array.isArray(pkg.partslots)) {
              pkg.partslots.forEach((slot: { quality_tiers?: Record<string, { recommended_parts?: Array<{ brand?: string; price?: number }> }> }) => {
                if (slot.quality_tiers) {
                  Object.entries(slot.quality_tiers).forEach(([tierName, tierData]) => {
                    if (!availableTiers.includes(tierName)) {
                      availableTiers.push(tierName);
                    }
                    // Sum prices for this tier
                    if (tierData.recommended_parts && Array.isArray(tierData.recommended_parts)) {
                      tierData.recommended_parts.forEach((part) => {
                        if (part.price) {
                          tierPrices[tierName] = (tierPrices[tierName] || 0) + part.price;
                        }
                        if (part.brand && !tierBrands[tierName]?.includes(part.brand)) {
                          tierBrands[tierName] = [...(tierBrands[tierName] || []), part.brand];
                        }
                      });
                    }
                  });
                }
              });
            }
            
            // Sort tiers in display order
            const tierOrder = ['Economy', 'Standard', 'Premium', 'Performance'];
            const sortedTiers = tierOrder.filter(t => availableTiers.includes(t));
            
            // Get description
            const description = getServicePackageDescription(pkg.title);
            const shortDescription = description.split('.')[0] + '.';
            
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
                          {pkg.difficulty && (
                            <span className="text-white/70 text-xs capitalize">{pkg.difficulty}</span>
                          )}
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
                </div>
                
                {/* Tier Preview Grid */}
                {sortedTiers.length > 0 && (
                  <div className="p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: CARFIX_COLORS.mutedForeground }}>
                      Choose Your Value Level
                    </p>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(sortedTiers.length, 3)}, 1fr)` }}>
                      {sortedTiers.slice(0, 3).map((tierName) => {
                        const tierConfig = QUALITY_TIER_CONFIG[tierName as keyof typeof QUALITY_TIER_CONFIG];
                        const isRecommended = tierName === 'Standard';
                        const price = tierPrices[tierName] || pkg.from_price;
                        const brands = tierBrands[tierName] || [];
                        
                        return (
                          <div
                            key={tierName}
                            className="relative p-2 rounded-xl text-center transition-all"
                            style={{
                              background: isRecommended ? `${CARFIX_COLORS.primary}10` : CARFIX_COLORS.background,
                              border: `2px solid ${isRecommended ? CARFIX_COLORS.primary : CARFIX_COLORS.border}`,
                            }}
                          >
                            {/* Recommended Badge */}
                            {isRecommended && (
                              <div 
                                className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide whitespace-nowrap"
                                style={{ background: '#22C55E', color: 'white' }}
                              >
                                Recommended
                              </div>
                            )}
                            
                            {/* Tier Name */}
                            <p className="text-xs font-semibold mt-1" style={{ color: tierConfig?.textColor || CARFIX_COLORS.foreground }}>
                              {tierConfig?.emoji} {tierName}
                            </p>
                            
                            {/* Brand Logos - Show first 2 */}
                            {brands.length > 0 && (
                              <div className="flex items-center justify-center gap-1 mt-1.5 h-6">
                                {brands.slice(0, 2).map((brand, idx) => (
                                  <div 
                                    key={idx}
                                    className="h-5 w-10 bg-white rounded flex items-center justify-center overflow-hidden"
                                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                                  >
                                    <img 
                                      src={IMAGE_URLS.brandLogo(brand)}
                                      alt={brand}
                                      className="h-full w-full object-contain p-0.5"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-[8px] font-medium text-gray-600 truncate px-1">${brand}</span>`;
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Price */}
                            <p className="text-sm font-bold mt-1.5" style={{ color: CARFIX_COLORS.foreground }}>
                              ${price.toFixed(0)}
                            </p>
                            <p className="text-[9px]" style={{ color: CARFIX_COLORS.mutedForeground }}>inc GST</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* CTA Button */}
                <div className="px-3 pb-3">
                  <button
                    onClick={() => onPackageSelect?.(pkg)}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all"
                    style={{
                      background: CARFIX_COLORS.primary,
                      color: 'white',
                    }}
                  >
                    View Package Details
                  </button>
                </div>
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
            className="transition-all duration-300 overflow-hidden"
            style={{
              ...(isHighlighted ? glassCardPremium : glassCard),
              background: isHighlighted 
                ? 'linear-gradient(135deg, rgba(0, 82, 164, 0.85) 0%, rgba(0, 51, 102, 0.9) 100%)'
                : 'rgba(20, 30, 50, 0.75)',
            }}
          >
            {/* Section Header - High contrast with solid colors */}
            <div 
              className="px-3 py-2.5 flex items-center justify-between"
              style={{
                background: isHighlighted 
                  ? 'rgba(0, 102, 204, 0.8)'
                  : 'rgba(0, 51, 102, 0.7)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
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
            
            {/* Products Grid */}
            <div className="p-3 flex flex-col gap-3">
              {groupProducts.map((product, index) => {
                const isSpotlighted = !!(highlightedProduct && productMatchesSpotlight(product, highlightedProduct));
                
                return (
                  <ResponsiveProductCard
                    key={`${product.id}-${index}`}
                    product={product}
                    isSpotlighted={isSpotlighted}
                    spotlightedRef={spotlightedRef}
                    onProductClick={onProductClick}
                    viewportSize={viewportSize}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
      
      {/* Lazy loading sentinel - triggers loading more products when visible */}
      {visibleCount < products.length && (
        <div 
          ref={loadMoreRef}
          className="flex items-center justify-center py-4"
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading more ({visibleCount} of {products.length})...</span>
          </div>
        </div>
      )}
      
      {/* Bottom padding for scroll */}
      <div className="h-4" />
    </div>
    </>
  );
};
