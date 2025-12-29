import React, { useRef, useEffect, useMemo } from "react";
import type { Product, ServicePackage } from "../../types";
import type { HighlightedProduct } from "../../types/message";

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

/** Mobile Card: Compact vertical layout with image on top */
const MobileProductCard: React.FC<{
  product: Product;
  isSpotlighted: boolean;
  spotlightedRef?: React.RefObject<HTMLDivElement>;
  onProductClick?: (product: Product) => void;
}> = ({ product, isSpotlighted, spotlightedRef, onProductClick }) => (
  <div 
    ref={isSpotlighted ? spotlightedRef : undefined}
    onClick={() => onProductClick?.(product)}
    className={`md:hidden cursor-pointer active:scale-[0.98] transition-all duration-200 bg-white rounded-xl border relative overflow-hidden ${
      isSpotlighted 
        ? "ring-2 ring-blue-500 shadow-lg border-blue-200" 
        : "border-gray-100 shadow-md"
    }`}
    style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: isSpotlighted ? '1px solid #bfdbfe' : '1px solid #f3f4f6',
      boxShadow: isSpotlighted 
        ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' 
        : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}
  >
    {isSpotlighted && <SpotlightBadge />}
    
    {/* Compact Image */}
    <div className="aspect-[16/10] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-2" />
      ) : (
        <NoImagePlaceholder size="sm" />
      )}
    </div>
    
    {/* Compact Info */}
    <div className="p-2.5">
      <p className="text-sm font-semibold text-gray-900 line-clamp-1 mb-0.5">{product.name}</p>
      {product.brand && (
        <p className="text-xs text-gray-500 mb-1.5">{product.brand}</p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-bold text-blue-600">
          {product.price > 0 ? `$${product.price.toFixed(2)}` : 'POA'}
        </span>
        <button 
          className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
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

/** Tablet Card: Medium vertical card with hover effects, 2-column grid */
const TabletProductCard: React.FC<{
  product: Product;
  isSpotlighted: boolean;
  spotlightedRef?: React.RefObject<HTMLDivElement>;
  onProductClick?: (product: Product) => void;
}> = ({ product, isSpotlighted, spotlightedRef, onProductClick }) => (
  <div 
    ref={isSpotlighted ? spotlightedRef : undefined}
    onClick={() => onProductClick?.(product)}
    className={`hidden md:block lg:hidden cursor-pointer transition-all duration-300 bg-white rounded-2xl border relative overflow-hidden hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 ${
      isSpotlighted 
        ? "ring-2 ring-blue-500 shadow-xl border-blue-200" 
        : "border-gray-100 shadow-lg"
    }`}
  >
    {isSpotlighted && <SpotlightBadge />}
    
    {/* Larger Image for Tablet */}
    <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-4" />
      ) : (
        <NoImagePlaceholder size="md" />
      )}
    </div>
    
    {/* Info Section */}
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

/** Desktop Card: Premium horizontal layout with image left, info right */
const DesktopProductCard: React.FC<{
  product: Product;
  isSpotlighted: boolean;
  spotlightedRef?: React.RefObject<HTMLDivElement>;
  onProductClick?: (product: Product) => void;
}> = ({ product, isSpotlighted, spotlightedRef, onProductClick }) => (
  <div 
    ref={isSpotlighted ? spotlightedRef : undefined}
    onClick={() => onProductClick?.(product)}
    className={`hidden lg:flex flex-row cursor-pointer transition-all duration-300 bg-white rounded-2xl border relative overflow-hidden hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-0.5 group ${
      isSpotlighted 
        ? "ring-2 ring-blue-500 shadow-xl border-blue-200" 
        : "border-gray-100 shadow-lg"
    }`}
    style={{ minHeight: '140px' }}
  >
    {isSpotlighted && <SpotlightBadge variant="horizontal" />}
    
    {/* Left: Image Section */}
    <div className="w-36 shrink-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
      {product.image_url ? (
        <img 
          src={product.image_url} 
          alt={product.name} 
          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" 
        />
      ) : (
        <NoImagePlaceholder size="lg" />
      )}
    </div>
    
    {/* Right: Info Section */}
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
        
        {/* Desktop: Dual action buttons */}
        <div className="flex gap-2">
          <button 
            className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onProductClick?.(product);
            }}
          >
            Details
          </button>
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
  </div>
);

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
  hasVehicle = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Record<string, HTMLElement | null>>({});
  const spotlightedRef = useRef<HTMLDivElement>(null);

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

  const hasContent = products.length > 0 || servicePackages.length > 0;
  const showLoading = isResearching;
  const showContent = hasContent && !isResearching;
  const topOffset = hasVehicle ? '56px' : '8px';

  return (
    <div 
      ref={scrollRef}
      className={`absolute right-2 md:right-3 lg:right-4 w-[52%] md:w-[55%] lg:w-[58%] max-w-[280px] md:max-w-[400px] lg:max-w-[520px] overflow-y-auto overflow-x-hidden z-30 flex flex-col gap-3 md:gap-4 lg:gap-5 pb-4 transition-all duration-300 ease-out ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 pointer-events-none"
      }`}
      style={{
        top: topOffset,
        bottom: 'calc(70px + env(safe-area-inset-bottom, 8px))',
        paddingTop: 'env(safe-area-inset-top, 4px)'
      }}
    >
      {/* Loading state */}
      {showLoading && (
        <div className="rounded-xl bg-white/90 backdrop-blur-sm p-4 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="font-medium">Finding parts...</span>
          </div>
        </div>
      )}

      {/* Service Packages */}
      {showContent && servicePackages.length > 0 && (
        <div className="space-y-2 md:space-y-3">
          <div className="text-xs font-bold text-blue-700 flex items-center gap-1.5 px-1 uppercase tracking-wide">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Service Packages
          </div>
          {servicePackages.map((pkg) => (
            <div
              key={pkg.id}
              onClick={() => onPackageSelect?.(pkg)}
              className="cursor-pointer active:scale-[0.98] transition-all bg-white rounded-xl md:rounded-2xl border border-gray-100 p-3 md:p-4 shadow-md hover:shadow-lg md:hover:scale-[1.02]"
            >
              <p className="text-sm md:text-base font-semibold text-gray-900 line-clamp-2 mb-1">{pkg.title}</p>
              <p className="text-lg md:text-xl font-bold text-blue-600">From ${pkg.from_price.toFixed(0)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Products - Grouped by part type */}
      {showContent && groupedProducts.map(({ name, products: groupProducts }) => {
        const isHighlighted = highlightedPartType && matchesPartType(name, highlightedPartType);
        
        return (
          <section 
            key={name}
            ref={(el) => { groupRefs.current[name] = el; }}
            className={`rounded-xl md:rounded-2xl transition-all ${
              isHighlighted ? "ring-2 ring-blue-500 bg-blue-50/80 p-2 md:p-3 shadow-lg" : ""
            }`}
          >
            <h3 className="text-xs md:text-sm font-bold mb-2 md:mb-3 flex items-center gap-1.5 px-1 text-gray-800 uppercase tracking-wide">
              <svg className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="truncate">{name}</span>
              <span className="text-[10px] md:text-xs text-gray-500 font-medium">({groupProducts.length})</span>
            </h3>
            
            {/* Mobile: Single column */}
            {/* Tablet: 2-column grid */}
            {/* Desktop: Single column of horizontal cards */}
            <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:flex lg:flex-col lg:gap-4">
              {groupProducts.map((product, index) => {
                const isSpotlighted = highlightedProduct && productMatchesSpotlight(product, highlightedProduct);
                
                return (
                  <React.Fragment key={`${product.id}-${index}`}>
                    {/* Mobile Card */}
                    <MobileProductCard
                      product={product}
                      isSpotlighted={isSpotlighted}
                      spotlightedRef={spotlightedRef}
                      onProductClick={onProductClick}
                    />
                    
                    {/* Tablet Card */}
                    <TabletProductCard
                      product={product}
                      isSpotlighted={isSpotlighted}
                      spotlightedRef={spotlightedRef}
                      onProductClick={onProductClick}
                    />
                    
                    {/* Desktop Card */}
                    <DesktopProductCard
                      product={product}
                      isSpotlighted={isSpotlighted}
                      spotlightedRef={spotlightedRef}
                      onProductClick={onProductClick}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
