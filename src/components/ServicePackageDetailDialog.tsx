import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductImage } from "@/components/ProductImage";
import { ServicePackage, Part, QualityTiers } from "@/types/servicePackage";
import { Badge } from "@/components/ui/badge";
import { Clock, Wrench, Package, Star, Zap, DollarSign, Award } from "lucide-react";

interface ServicePackageDetailDialogProps {
  package_: ServicePackage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TierKey = keyof QualityTiers;

const TIER_CONFIG: Record<TierKey, { 
  label: string; 
  icon: React.ReactNode; 
  className: string;
  badgeClass: string;
}> = {
  Economy: { 
    label: "Economy", 
    icon: <DollarSign className="h-4 w-4" />,
    className: "data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300"
  },
  Standard: { 
    label: "Standard", 
    icon: <Star className="h-4 w-4" />,
    className: "data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-300"
  },
  Premium: { 
    label: "Premium", 
    icon: <Award className="h-4 w-4" />,
    className: "data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-300"
  },
  Performance: { 
    label: "Performance", 
    icon: <Zap className="h-4 w-4" />,
    className: "data-[state=active]:bg-red-100 data-[state=active]:text-red-900",
    badgeClass: "bg-red-100 text-red-700 border-red-300"
  }
};

const TIERS: TierKey[] = ["Economy", "Standard", "Premium", "Performance"];

const formatPrice = (value: number): string => {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2
  }).format(value);
};

export const ServicePackageDetailDialog = ({ 
  package_, 
  open, 
  onOpenChange 
}: ServicePackageDetailDialogProps) => {
  if (!package_) return null;

  // Find which tiers have products
  const availableTiers = TIERS.filter(tier => 
    package_.partslots.some(ps => ps.products.quality_tiers[tier]?.length > 0)
  );

  const defaultTier = package_.carfixValueTier as TierKey || availableTiers[0] || "Standard";

  // Calculate tier totals
  const getTierTotal = (tier: TierKey): number => {
    return package_.partslots.reduce((total, partslot) => {
      const products = partslot.products.quality_tiers[tier] || [];
      // Take the first (cheapest) product from each partslot
      const cheapest = products[0];
      return total + (cheapest?.price || 0);
    }, 0);
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
          
          {/* Package meta info */}
          <div className="flex flex-wrap gap-3 mt-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {package_.estimated_time}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              {package_.difficulty_level}
            </Badge>
            {package_.bundle_discount_percentage > 0 && (
              <Badge className="bg-green-100 text-green-700 border-green-300">
                {package_.bundle_discount_percentage}% Bundle Discount
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue={defaultTier} className="flex-1 flex flex-col min-h-0 mt-4">
          <TabsList className="grid grid-cols-4 gap-1 flex-shrink-0">
            {TIERS.map(tier => {
              const config = TIER_CONFIG[tier];
              const isAvailable = availableTiers.includes(tier);
              const tierTotal = getTierTotal(tier);
              const isCarfixValue = package_.carfixValueTier === tier;
              
              return (
                <TabsTrigger 
                  key={tier} 
                  value={tier}
                  disabled={!isAvailable}
                  className={`flex flex-col items-center gap-0.5 py-2 px-1 ${config.className} ${!isAvailable ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    {config.icon}
                    <span className="text-xs font-medium">{config.label}</span>
                    {isCarfixValue && (
                      <Badge className="ml-1 text-[10px] px-1 py-0 bg-orange-500 text-white">VALUE</Badge>
                    )}
                  </div>
                  {isAvailable && (
                    <span className="text-xs font-bold">{formatPrice(tierTotal)}</span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {TIERS.map(tier => (
            <TabsContent 
              key={tier} 
              value={tier} 
              className="flex-1 overflow-y-auto mt-4 pr-2"
            >
              <div className="space-y-6">
                {package_.partslots.map(partslot => {
                  const products = partslot.products.quality_tiers[tier] || [];
                  if (products.length === 0) return null;
                  
                  return (
                    <div key={partslot.id} className="space-y-3">
                      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b pb-2">
                        {partslot.name}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {products.map((product: Part) => (
                          <ProductCard 
                            key={product.sku} 
                            product={product} 
                            tier={tier}
                            isCarfixValue={package_.carfixValueProducts?.includes(product.sku)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

interface ProductCardProps {
  product: Part;
  tier: TierKey;
  isCarfixValue?: boolean;
}

const ProductCard = ({ product, tier, isCarfixValue }: ProductCardProps) => {
  const tierConfig = TIER_CONFIG[tier];
  
  return (
    <div className="relative border rounded-lg p-3 bg-card hover:shadow-md transition-shadow">
      {isCarfixValue && (
        <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] px-1.5">
          CARFIX VALUE
        </Badge>
      )}
      {product.is_on_sale && (
        <Badge className="absolute -top-2 left-2 bg-red-500 text-white text-[10px] px-1.5 animate-pulse">
          SALE
        </Badge>
      )}
      
      <div className="flex gap-3">
        <div className="w-16 h-16 flex-shrink-0 rounded bg-muted/50 overflow-hidden">
          <ProductImage 
            sku={product.sku}
            brand={product.brand}
            alt={product.name}
            className="w-full h-full object-contain"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" title={product.name}>
            {product.name}
          </p>
          <p className="text-xs text-muted-foreground">{product.brand}</p>
          <Badge variant="outline" className={`mt-1 text-[10px] ${tierConfig.badgeClass}`}>
            {tier}
          </Badge>
        </div>
      </div>
      
      <div className="mt-2 flex items-end justify-between">
        <div>
          {product.is_on_sale && product.was_price ? (
            <>
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.was_price)}
              </span>
              <span className="ml-1 font-bold text-red-600">
                {formatPrice(product.sale_price || product.price)}
              </span>
            </>
          ) : (
            <span className="font-bold">{formatPrice(product.price)}</span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">{product.sku}</span>
      </div>
    </div>
  );
};
