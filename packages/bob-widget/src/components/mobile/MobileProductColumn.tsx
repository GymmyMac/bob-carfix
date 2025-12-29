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
      className={`absolute right-2 w-[52%] md:w-[48%] lg:w-[45%] max-w-[320px] overflow-y-auto overflow-x-hidden z-30 flex flex-col gap-4 pb-4 transition-all duration-300 ease-out ${
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
        <div className="space-y-2">
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
              className="cursor-pointer active:scale-[0.98] transition-all bg-white rounded-xl border border-gray-100 p-3 shadow-md hover:shadow-lg"
            >
              <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{pkg.title}</p>
              <p className="text-lg font-bold text-blue-600">From ${pkg.from_price.toFixed(0)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Products */}
      {showContent && groupedProducts.map(({ name, products: groupProducts }, groupIndex) => {
        const isHighlighted = highlightedPartType && matchesPartType(name, highlightedPartType);
        
        return (
          <section 
            key={name}
            ref={(el) => { groupRefs.current[name] = el; }}
            className={`rounded-xl transition-all ${
              isHighlighted ? "ring-2 ring-blue-500 bg-blue-50/80 p-2 shadow-lg" : ""
            }`}
          >
            <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5 px-1 text-gray-800 uppercase tracking-wide">
              <svg className="h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="truncate">{name}</span>
              <span className="text-[10px] text-gray-500 font-medium">({groupProducts.length})</span>
            </h3>
            
            <div className="space-y-4">
              {groupProducts.map((product, index) => {
                const isSpotlighted = highlightedProduct && productMatchesSpotlight(product, highlightedProduct);
                
                return (
                  <div 
                    key={`${product.id}-${index}`}
                    ref={isSpotlighted ? spotlightedRef : undefined}
                    onClick={() => onProductClick?.(product)}
                    className={`cursor-pointer active:scale-[0.98] transition-all duration-200 bg-white rounded-2xl border relative overflow-hidden hover:scale-[1.02] ${
                      isSpotlighted 
                        ? "ring-2 ring-blue-500 shadow-xl border-blue-200" 
                        : "border-gray-100 shadow-lg hover:shadow-xl"
                    }`}
                  >
                    {isSpotlighted && (
                      <span className="absolute top-3 right-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs px-2.5 py-1 rounded-full z-20 flex items-center gap-1 font-semibold shadow-md">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Bob's Pick
                      </span>
                    )}
                    
                    {/* Product Image */}
                    <div className="aspect-[4/3] md:aspect-[3/2] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-3 md:p-4" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <svg className="h-10 w-10 md:h-12 md:w-12 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs font-medium uppercase tracking-wide">No Image</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-3 md:p-4">
                      <p className="text-sm md:text-base font-semibold text-gray-900 line-clamp-2 mb-1">{product.name}</p>
                      {product.brand && (
                        <p className="text-xs md:text-sm text-gray-600 font-medium mb-2">{product.brand}</p>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg md:text-xl font-bold text-blue-600">
                          {product.price > 0 ? `$${product.price.toFixed(2)}` : 'POA'}
                        </span>
                      </div>
                      
                      {/* Action Button */}
                      <button 
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm md:text-base font-semibold py-2.5 md:py-3 rounded-xl hover:from-blue-700 hover:to-blue-600 active:from-blue-800 active:to-blue-700 transition-all shadow-md"
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
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
