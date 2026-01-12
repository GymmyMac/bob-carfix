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

  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    
    // DEBUG: Log incoming products for grouping
    console.log('[MobileProductColumn] Grouping products:', {
      count: products.length,
      sample: products[0] ? {
        id: products[0].id,
        name: products[0].name,
        partslotDescription: products[0].partslotDescription,
        brand: products[0].brand,
        price: products[0].price,
      } : 'empty',
      allPartslots: products.map(p => p.partslotDescription || 'undefined').slice(0, 10)
    });
    
    products.forEach(product => {
      const key = product.partslotDescription || 'Other Parts';
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    
    const sortedGroupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    const result = sortedGroupNames.map(name => ({ name, products: groups[name] }));
    
    // DEBUG: Log grouping result
    console.log('[MobileProductColumn] Grouped result:', {
      groupCount: result.length,
      groups: result.map(g => ({ name: g.name, count: g.products.length }))
    });
    
    return result;
  }, [products]);

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
  
  // Layout calculations
  const columnWidth = viewportSize === 'mobile' ? 80 : viewportSize === 'tablet' ? 50 : 35;
  const topOffset = `calc(${counterHeightPercent}vh + env(safe-area-inset-top, 8px))`;

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
        className={`absolute overflow-y-auto overflow-x-hidden z-30 flex flex-col gap-4 md:gap-5 transition-all duration-400 ease-out product-scroll ${
          visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12 pointer-events-none"
        }`}
        style={{
          // Right-aligned, 80% width
          width: `${columnWidth}%`,
          maxWidth: '440px',
          right: '0',
          left: 'auto',
          top: topOffset,
          bottom: 'calc(75px + env(safe-area-inset-bottom, 8px))',
          paddingTop: 'env(safe-area-inset-top, 4px)',
          paddingRight: '8px',   // Tight to right edge
          paddingLeft: '16px',   // Space for Bob
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

      {/* Service Packages - Premium Glass Cards */}
      {showContent && servicePackages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div 
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ 
                background: 'linear-gradient(135deg, rgba(0, 102, 204, 0.8) 0%, rgba(0, 73, 153, 0.9) 100%)',
                boxShadow: '0 4px 12px rgba(0, 102, 204, 0.4)',
              }}
            >
              <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span style={{ ...glassText.primary, fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Service Packages
            </span>
          </div>
          {servicePackages.map((pkg) => (
            <div
              key={pkg.id}
              onClick={() => onPackageSelect?.(pkg)}
              className="cursor-pointer group transition-all duration-300 overflow-hidden glass-card"
              style={{
                ...glassCard,
                transform: 'scale(1)',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02) translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 16px 56px rgba(0, 0, 0, 0.4), 0 0 24px rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.boxShadow = glassCard.boxShadow as string;
              }}
            >
              {/* Main content area */}
              <div className="p-4 flex gap-4">
                {/* Large icon/image container */}
                <div 
                  className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  {pkg.icon_url ? (
                    <img 
                      src={pkg.icon_url} 
                      alt={pkg.title} 
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <svg className="h-10 w-10" style={{ color: 'rgba(255,255,255,0.7)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                </div>
                
                {/* Text content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <p style={{ ...glassText.primary, fontWeight: 700, fontSize: '16px' }} className="line-clamp-2 mb-1">{pkg.title}</p>
                    {pkg.description && (
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }} className="line-clamp-2">{pkg.description}</p>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500 }}>From</span>
                    <span style={{ ...glassText.price, fontSize: '24px', fontWeight: 800 }}>${pkg.from_price.toFixed(0)}</span>
                  </div>
                </div>
              </div>
              
              {/* CTA Button - Glass with orange accent */}
              <div 
                className="px-4 py-3 transition-colors"
                style={{
                  background: 'rgba(255, 149, 0, 0.15)',
                  borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <span style={{ ...glassText.price, fontSize: '14px', fontWeight: 600 }}>View Package Details</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: '#FF9500' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
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
                ? 'linear-gradient(135deg, rgba(0, 102, 204, 0.2) 0%, rgba(0, 102, 204, 0.08) 100%)'
                : glassCard.background,
            }}
          >
            {/* Section Header */}
            <div 
              className="px-3 py-2.5 flex items-center justify-between"
              style={{
                background: isHighlighted 
                  ? 'rgba(0, 102, 204, 0.15)'
                  : 'rgba(255,255,255,0.05)',
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
                  style={{ color: isHighlighted ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.8)' }}
                >
                  {name}
                </span>
              </div>
              <span 
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.9)',
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
      
      {/* Bottom padding for scroll */}
      <div className="h-4" />
    </div>
    </>
  );
};
