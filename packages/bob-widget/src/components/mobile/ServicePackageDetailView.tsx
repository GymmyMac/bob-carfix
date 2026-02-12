import React, { useState, useMemo } from "react";
import { 
  QUALITY_TIER_CONFIG, 
  formatNZD, 
  IMAGE_URLS, 
  CARFIX_COLORS,
  getServicePackageDescription
} from "../../styles/carfix-tokens";
import type { PreparedTier, PreparedTierProduct } from "../../types/product";
import { isRearBrakePackage, filterByBrakeType, recalcTierTotal, type RearBrakeType } from "../../utils/rearBrakeFilter";

/**
 * Service package interface - preparedTiers is the ONLY source of truth
 */
interface ServicePackageDetail {
  id: string;
  title: string;
  description: string;
  from_price: number;
  estimated_time?: string;
  difficulty_level?: string;
  bundle_discount_percentage?: number;
  carfixValueProducts?: string[];
  preparedTiers?: PreparedTier[];
  icon_url?: string;
}

interface ServicePackageDetailViewProps {
  package: ServicePackageDetail;
  onBack: () => void;
  onAddToCart?: (products: PreparedTierProduct[]) => void;
  onNavigateToProductPage?: (sku: string) => void;
}

/**
 * ServicePackageDetailView - CARFIX Website Specification
 * Uses preparedTiers EXCLUSIVELY - no client-side fallback processing
 * Server is the single source of truth for products, prices, and tiers
 */
export const ServicePackageDetailView: React.FC<ServicePackageDetailViewProps> = ({
  package: pkg,
  onBack,
  onAddToCart,
  onNavigateToProductPage
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [rearBrakeType, setRearBrakeType] = useState<RearBrakeType>('disc');
  
  const isRearBrake = useMemo(() => isRearBrakePackage(pkg), [pkg.id, pkg.title]);
  
  // Filter visible tiers (not hidden) - preparedTiers is the ONLY source
  const visiblePreparedTiers = useMemo(() => {
    if (!pkg.preparedTiers || pkg.preparedTiers.length === 0) return [];
    const visible = pkg.preparedTiers.filter(tier => !tier.isHidden);
    if (!isRearBrake) return visible;
    // Apply brake type filter and recalculate prices
    return visible.map(tier => {
      const filtered = filterByBrakeType(tier.products, rearBrakeType);
      return { ...tier, products: filtered, totalPrice: recalcTierTotal(filtered), productCount: filtered.length };
    });
  }, [pkg.preparedTiers, isRearBrake, rearBrakeType]);
  
  const hasTiers = visiblePreparedTiers.length > 0;
  
  // Handle add to cart using preparedTiers (filtered products)
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
  
  // Total parts count from preparedTiers
  const totalPartsCount = visiblePreparedTiers[0]?.productCount || 0;

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
          
          {/* Disc / Drum brake type toggle - only for Rear Brake Service */}
          {isRearBrake && (
            <div className="mt-3">
              <p className="text-[11px] text-[#94A3B8] mb-1.5">Select your vehicle's rear brake type</p>
              <div className="flex rounded-xl overflow-hidden border border-[#E2E8F0] bg-white">
                <button
                  onClick={() => setRearBrakeType('disc')}
                  className="flex-1 py-2 px-3 text-xs font-semibold transition-all"
                  style={{
                    background: rearBrakeType === 'disc' ? CARFIX_COLORS.primary : 'transparent',
                    color: rearBrakeType === 'disc' ? '#FFFFFF' : '#64748B',
                  }}
                >
                  Disc Brakes (Pads + Rotors)
                </button>
                <button
                  onClick={() => setRearBrakeType('drum')}
                  className="flex-1 py-2 px-3 text-xs font-semibold transition-all"
                  style={{
                    background: rearBrakeType === 'drum' ? CARFIX_COLORS.primary : 'transparent',
                    color: rearBrakeType === 'drum' ? '#FFFFFF' : '#64748B',
                  }}
                >
                  Drum Brakes (Shoes + Drums)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Choose Your Value Level Header */}
        <div className="px-4 py-3 flex items-center justify-center gap-2 border-b border-[#E2E8F0] bg-white">
          <span className="font-semibold text-[#0F172A] text-sm">Choose Your Value Level</span>
          <span className="text-[#64748B] text-xs cursor-help" title="Select the quality tier that suits your needs">ⓘ</span>
        </div>
        
        {/* Tier Selection Cards - Horizontal Grid */}
        <div className="p-4">
          {hasTiers ? (
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
                        style={{ background: CARFIX_COLORS.primary }}
                      >
                        ★ CARFIX VALUE
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
                                // Try with full brand name if URL was truncated
                                const img = e.target as HTMLImageElement;
                                const correctedUrl = `${IMAGE_URLS.storageBase}/brand_images/${brand.fullName.replace(/\s+/g, '')}.jpg`;
                                if (img.src !== correctedUrl) {
                                  img.src = correctedUrl;
                                } else {
                                  // Final fallback: show text
                                  const parent = img.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<span class="text-[10px] font-medium text-slate-700 px-1 truncate max-w-[60px]">${brand.name}</span>`;
                                  }
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
                      
                      {/* Add to Cart button - Green for Value tier, green text for others */}
                      <button
                        onClick={() => handleAddPreparedTierToCart(tier)}
                        className={`mt-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center ${
                          tier.isRecommended 
                            ? 'bg-[#22C55E] text-white shadow-md hover:bg-[#16A34A]' 
                            : 'bg-slate-100 text-[#22C55E] border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* No tier data available - show empty state */
            <div className="rounded-2xl p-6 bg-white border border-[#E2E8F0] shadow-md text-center">
              <svg className="w-12 h-12 mx-auto text-[#94A3B8] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-sm font-medium text-[#64748B]">
                Package details not available for this vehicle
              </p>
              <p className="text-xs text-[#94A3B8] mt-1">
                Please try refreshing or contact support
              </p>
            </div>
          )}
        </div>

        {/* View Product Details - Collapsible Accordion (CLOSED by default) */}
        {hasTiers && (
          <div className="px-4 pb-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 transition-all shadow-sm"
            >
              <span className="text-sm font-medium text-[#0F172A]">
                {showDetails ? '▼' : '▶'} View Product Details
              </span>
              <span className="text-xs text-[#64748B]">
                {totalPartsCount} product{totalPartsCount !== 1 ? 's' : ''}
              </span>
            </button>
            
            {/* Expanded product details */}
            {showDetails && (
              <div className="mt-3 space-y-4 bg-white rounded-xl border border-[#E2E8F0] p-3">
                {visiblePreparedTiers.map(tier => {
                  if (tier.products.length === 0) return null;
                  const tierConfig = QUALITY_TIER_CONFIG[tier.tierName as keyof typeof QUALITY_TIER_CONFIG];
                  
                  return (
                    <div key={tier.tierName} className="space-y-2">
                      {/* Tier section header */}
                      <div className="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
                        <span className="text-lg">{tierConfig?.emoji}</span>
                        <span 
                          className="font-semibold text-sm"
                          style={{ color: tierConfig?.textColor }}
                        >
                          {tier.displayName}
                        </span>
                        <span className="text-xs text-[#64748B]">({tier.products.length} parts)</span>
                      </div>
                      
                      {/* Products list - all data from server */}
                      <div className="space-y-2">
                        {tier.products.map((product, idx) => {
                          const isValueProduct = pkg.carfixValueProducts?.includes(product.sku);
                          const unitPrice = product.unitPrice ?? product.price;
                          
                          return (
                            <div
                              key={`${product.sku}-${idx}`}
                              className="flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-slate-50 cursor-pointer border border-[#E2E8F0]"
                              onClick={() => onNavigateToProductPage?.(product.sku)}
                            >
                              {/* Product image - use server-provided URL */}
                              <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-white overflow-hidden border border-[#E2E8F0]">
                                <img 
                                  src={product.productImageUrl || IMAGE_URLS.productImage(product.sku)}
                                  alt={product.name}
                                  className="w-full h-full object-contain p-1.5"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                                  }}
                                />
                              </div>
                              
                              {/* Product info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-semibold text-[#0F172A]">{product.brandFullName || product.brand}</span>
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
                                  {product.isMultiQty && product.perCarQty > 1 && (
                                    <span 
                                      className="px-1.5 py-0.5 text-[8px] font-bold rounded-full"
                                      style={{
                                        background: '#F0FDF4',
                                        color: '#15803D',
                                      }}
                                    >
                                      ×{product.perCarQty}
                                    </span>
                                  )}
                                  {product.isRotor && (
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
                                <p className="text-xs text-[#64748B] line-clamp-1">{product.name}</p>
                              </div>
                              
                              {/* Price with multi-qty breakdown - all from server */}
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-bold text-[#0F172A]">{formatNZD(product.displayPrice)}</p>
                                {product.isMultiQty && product.perCarQty > 1 && (
                                  <p className="text-[10px] text-[#64748B]">
                                    {product.perCarQty}× {formatNZD(unitPrice)} each
                                  </p>
                                )}
                                {product.isRotor && !product.isMultiQty && (
                                  <p className="text-[10px] text-[#64748B]">
                                    {formatNZD(unitPrice)} each
                                  </p>
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
