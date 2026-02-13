import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServicePackage, PreparedTier, PreparedTierProduct } from "@/types/servicePackage";
import { Badge } from "@/components/ui/badge";
import { Clock, Wrench, Package, Star, Zap, DollarSign, Award, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { isRearBrakePackage, filterByBrakeType, recalcTierTotal, type RearBrakeType } from "@/utils/rearBrakeFilter";

interface ServicePackageDetailDialogProps {
  package_: ServicePackage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart?: (products: PreparedTierProduct[]) => void;
}

type TierName = "Economy" | "Standard" | "Premium" | "Performance";

const TIER_CONFIG: Record<TierName, { 
  label: string; 
  icon: React.ReactNode; 
  className: string;
  badgeClass: string;
  emoji: string;
}> = {
  Economy: { 
    label: "Economy", 
    icon: <DollarSign className="h-4 w-4" />,
    className: "border-slate-300 hover:bg-slate-50",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    emoji: "💰"
  },
  Standard: { 
    label: "Standard", 
    icon: <Star className="h-4 w-4" />,
    className: "border-blue-300 hover:bg-blue-50",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-300",
    emoji: "⭐"
  },
  Premium: { 
    label: "Premium", 
    icon: <Award className="h-4 w-4" />,
    className: "border-amber-300 hover:bg-amber-50",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-300",
    emoji: "👑"
  },
  Performance: { 
    label: "Performance", 
    icon: <Zap className="h-4 w-4" />,
    className: "border-red-300 hover:bg-red-50",
    badgeClass: "bg-red-100 text-red-700 border-red-300",
    emoji: "🏎️"
  }
};

const formatPrice = (value: number): string => {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2
  }).format(value);
};

/**
 * ServicePackageDetailDialog - CARFIX Parity Implementation
 * Uses preparedTiers EXCLUSIVELY - no client-side fallback to partslots
 * Server is the single source of truth for products, prices, and tiers
 */
export const ServicePackageDetailDialog = ({ 
  package_, 
  open, 
  onOpenChange,
  onAddToCart
}: ServicePackageDetailDialogProps) => {
  const [selectedTier, setSelectedTier] = useState<TierName | null>(null);
  const [rearBrakeType, setRearBrakeType] = useState<RearBrakeType>('disc');

  const isRearBrake = useMemo(() => package_ ? isRearBrakePackage(package_) : false, [package_?.id, package_?.title]);

  // Filter visible tiers (not hidden) - preparedTiers is the ONLY source
  const visibleTiers = useMemo(() => {
    if (!package_?.preparedTiers || package_.preparedTiers.length === 0) return [];
    const visible = package_.preparedTiers.filter(tier => !tier.isHidden);
    if (!isRearBrake) return visible;
    return visible.map(tier => {
      const filtered = filterByBrakeType(tier.products, rearBrakeType);
      return { ...tier, products: filtered, totalPrice: recalcTierTotal(filtered), productCount: filtered.length };
    });
  }, [package_?.preparedTiers, isRearBrake, rearBrakeType]);

  // Set default selected tier to recommended or first visible
  const defaultTier = useMemo(() => {
    if (visibleTiers.length === 0) return null;
    const recommended = visibleTiers.find(t => t.isRecommended);
    return (recommended?.tierName || visibleTiers[0]?.tierName) as TierName;
  }, [visibleTiers]);

  // Use default if no selection
  const activeTierName = selectedTier || defaultTier;
  const activeTier = visibleTiers.find(t => t.tierName === activeTierName);

  if (!package_) return null;

  const handleAddToCart = (tier: PreparedTier) => {
    const discountPct = tier.bundleDiscountPercentage || 0;
    if (discountPct > 0) {
      const multiplier = 1 - (discountPct / 100);
      const discounted = tier.products.map(p => ({
        ...p,
        displayPrice: Math.round(p.displayPrice * multiplier * 100) / 100,
      }));
      onAddToCart?.(discounted);
    } else {
      onAddToCart?.(tier.products);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{package_.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{package_.description}</p>
              </div>
            </div>
          </div>
          
          {/* Disc / Drum brake type toggle - only for Rear Brake Service */}
          {isRearBrake && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1.5">Select your vehicle's rear brake type</p>
              <div className="flex rounded-lg overflow-hidden border">
                <button
                  onClick={() => setRearBrakeType('disc')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold transition-all ${
                    rearBrakeType === 'disc'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Disc Brakes (Pads + Rotors)
                </button>
                <button
                  onClick={() => setRearBrakeType('drum')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold transition-all ${
                    rearBrakeType === 'drum'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Drum Brakes (Shoes + Drums)
                </button>
              </div>
            </div>
          )}

          {/* Package meta info */}
          <div className="flex flex-wrap gap-3 mt-4">
            {package_.estimated_time && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {package_.estimated_time}
              </Badge>
            )}
            {package_.difficulty_level && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                {package_.difficulty_level}
              </Badge>
            )}
            {package_.bundle_discount_percentage && package_.bundle_discount_percentage > 0 && (
              <Badge className="bg-green-100 text-green-700 border-green-300">
                {package_.bundle_discount_percentage}% Bundle Discount
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Tier selection from preparedTiers */}
        {visibleTiers.length > 0 ? (
          <div className="flex-1 flex flex-col min-h-0 mt-4 space-y-4">
            {/* Tier selector cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
              {visibleTiers.map(tier => {
                const tierName = tier.tierName as TierName;
                const config = TIER_CONFIG[tierName];
                const isActive = activeTierName === tierName;
                
                return (
                  <button
                    key={tier.tierName}
                    onClick={() => setSelectedTier(tierName)}
                    className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                      isActive 
                        ? 'border-primary bg-primary/5 shadow-md' 
                        : `border-border ${config?.className || ''}`
                    }`}
                  >
                    {/* Recommended badge */}
                    {tier.isRecommended && (
                      <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-1.5">
                        CARFIX VALUE
                      </Badge>
                    )}
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{config?.emoji}</span>
                      <span className="font-medium text-sm">{tier.displayName}</span>
                    </div>
                    
                    {/* Brand logos - Use server-provided URLs */}
                    <div className="flex gap-1 mb-2 min-h-[24px]">
                      {tier.brands.slice(0, 3).map(brand => (
                        <img 
                          key={brand.name}
                          src={brand.imageUrl}
                          alt={brand.fullName}
                          className="h-5 w-auto object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ))}
                    </div>
                    
                    {/* Price with bundle discount display */}
                    {tier.savingsAmount && tier.savingsAmount > 0 ? (
                      <div>
                        <div className="text-sm line-through text-muted-foreground">{formatPrice(tier.originalTotalPrice!)}</div>
                        <div className="font-bold text-lg text-green-600">{formatPrice(tier.totalPrice)}</div>
                        <div className="text-[10px] font-semibold text-green-600 bg-green-50 inline-block px-1.5 py-0.5 rounded-full">
                          SAVE {formatPrice(tier.savingsAmount)} — {tier.bundleDiscountPercentage}% Bundle Deal
                        </div>
                      </div>
                    ) : (
                      <div className="font-bold text-lg">{formatPrice(tier.totalPrice)}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {tier.productCount} part{tier.productCount !== 1 ? 's' : ''} • inc GST
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active tier products */}
            {activeTier && (
              <div className="flex-1 overflow-y-auto border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <span>{TIER_CONFIG[activeTierName as TierName]?.emoji}</span>
                    {activeTier.displayName} Tier Products
                  </h3>
                  <Button 
                    onClick={() => handleAddToCart(activeTier)}
                    className="gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add All to Cart
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeTier.products.map((product, idx) => (
                    <ProductCard 
                      key={`${product.sku}-${idx}`}
                      product={product} 
                      tierName={activeTierName as TierName}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* No preparedTiers - show empty state */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                Package details not available for this vehicle
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface ProductCardProps {
  product: PreparedTierProduct;
  tierName: TierName;
}

const ProductCard = ({ product, tierName }: ProductCardProps) => {
  const tierConfig = TIER_CONFIG[tierName];
  
  return (
    <div className="relative border rounded-lg p-3 bg-card hover:shadow-md transition-shadow">
      {/* Multi-quantity badge */}
      {product.isMultiQty && product.perCarQty > 1 && (
        <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-1.5">
          ×{product.perCarQty}
        </Badge>
      )}
      {/* Rotor pair badge */}
      {product.isRotor && (
        <Badge className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] px-1.5">
          PAIR
        </Badge>
      )}
      
      <div className="flex gap-3">
        {/* Product image - use server-provided URL */}
        <div className="w-16 h-16 flex-shrink-0 rounded bg-muted/50 overflow-hidden">
          <img 
            src={product.productImageUrl || '/placeholder.svg'}
            alt={product.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" title={product.name}>
            {product.name}
          </p>
          <p className="text-xs text-muted-foreground">{product.brandFullName || product.brand}</p>
          <Badge variant="outline" className={`mt-1 text-[10px] ${tierConfig?.badgeClass || ''}`}>
            {tierName}
          </Badge>
        </div>
      </div>
      
      <div className="mt-2 flex items-end justify-between">
        <div>
          {/* Quantity-based pricing display */}
          {product.isMultiQty && product.perCarQty > 1 ? (
            <div>
              <span className="text-xs text-muted-foreground">
                {product.perCarQty} × {formatPrice(product.unitPrice)} each
              </span>
              <div className="font-bold">{formatPrice(product.displayPrice)}</div>
            </div>
          ) : product.isRotor ? (
            <div>
              <span className="text-xs text-muted-foreground">
                Pair @ {formatPrice(product.unitPrice)} each
              </span>
              <div className="font-bold">{formatPrice(product.displayPrice)}</div>
            </div>
          ) : (
            <span className="font-bold">{formatPrice(product.displayPrice)}</span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">{product.sku}</span>
      </div>
    </div>
  );
};
