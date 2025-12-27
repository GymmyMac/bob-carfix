import { Product } from "@/types/product";
import { ServicePackage } from "@/types/servicePackage";
import { ProductImage } from "@/components/ProductImage";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { HighlightedProduct } from "@/hooks/useBobChat";

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
  hasVehicle?: boolean; // For dynamic top offset
}

// Flexible matching: handles plurals and word variations
// "SPARK PLUG" matches "SPARK PLUG SET", "SPARK PLUGS", etc.
const matchesPartType = (description: string, partType: string): boolean => {
  if (!description || !partType) return false;
  const desc = description.toLowerCase();
  // Normalize: remove trailing 's' for plural handling
  const baseTerms = partType.toLowerCase()
    .replace(/s\b/g, '') // "plugs" → "plug", "brakes" → "brake"
    .split(/\s+/)
    .filter(Boolean);
  return baseTerms.every(term => desc.includes(term));
};

// Check if a product matches the spotlight criteria
const productMatchesSpotlight = (product: Product, spotlight: HighlightedProduct): boolean => {
  const brandMatch = product.brand?.toLowerCase() === spotlight.brand.toLowerCase();
  const priceMatch = Math.abs(product.price - spotlight.price) < 1;
  return brandMatch && priceMatch;
};

// Chat drawer collapsed height (approximately 80px)
const CHAT_DRAWER_HEIGHT = 80;

export const MobileProductColumn = ({
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
}: MobileProductColumnProps) => {
  const [showPackages, setShowPackages] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const spotlightedRef = useRef<HTMLDivElement>(null);

  // Group products by partslotDescription (like desktop)
  const groupedProducts = products.reduce((acc, product) => {
    const key = product.partslotDescription || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const groupKeys = Object.keys(groupedProducts);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Log for debugging
  useEffect(() => {
    console.log('[MobileProductColumn] highlightedPartType changed:', highlightedPartType);
    console.log('[MobileProductColumn] product groups:', groupKeys);
  }, [highlightedPartType, groupKeys.length]);

  // Auto-scroll to highlighted section
  useEffect(() => {
    if (highlightedPartType && scrollRef.current) {
      // Find the matching group using flexible matching
      const matchingGroup = groupKeys.find(key => matchesPartType(key, highlightedPartType));
      console.log('[MobileProductColumn] Looking for group matching:', highlightedPartType, '-> found:', matchingGroup);
      
      if (matchingGroup && groupRefs.current[matchingGroup]) {
        groupRefs.current[matchingGroup]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [highlightedPartType, groupKeys]);

  const hasContent = products.length > 0 || servicePackages.length > 0;
  const showLoading = isResearching;
  const showContent = hasContent && !isResearching;

  // Calculate dynamic top offset based on vehicle bar presence
  const topOffset = hasVehicle ? '64px' : '16px';

  // Always render the container - use CSS for visibility
  // This prevents unmounting/remounting flicker
  return (
    <div 
      ref={scrollRef}
      className={cn(
        "absolute right-2 w-[45%] max-w-[200px]",
        "overflow-y-auto overflow-x-hidden z-40", // z-40 to be above chat drawer (z-30)
        "flex flex-col gap-2 pb-4",
        "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
        "transition-all duration-300 ease-out",
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 pointer-events-none"
      )}
      style={{
        // Dynamic top based on vehicle bar
        top: topOffset,
        // Position above counter AND above chat drawer
        bottom: `calc(${counterHeightPercent + 4}% + ${CHAT_DRAWER_HEIGHT}px)`,
        // Safe area for notches
        paddingTop: 'env(safe-area-inset-top, 4px)'
      }}
    >
      {/* Loading state */}
      {showLoading && (
        <div className="bg-background/90 backdrop-blur-sm rounded-lg p-3 border border-border shadow-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Finding parts...</span>
          </div>
        </div>
      )}

      {/* Service Packages */}
      {showContent && servicePackages.length > 0 && (
        <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border shadow-lg overflow-hidden">
          <button
            onClick={() => setShowPackages(!showPackages)}
            className="w-full p-2 flex items-center justify-between text-left bg-primary/10"
          >
            <span className="text-xs font-semibold text-primary flex items-center gap-1">
              <Package className="h-3 w-3" />
              Packages ({servicePackages.length})
            </span>
            {showPackages ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
          
          {showPackages && (
            <div className="p-1.5 space-y-1.5">
              {servicePackages.slice(0, 3).map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => onPackageSelect?.(pkg)}
                  className="w-full p-2 rounded-md bg-muted/50 hover:bg-muted 
                           text-left transition-colors"
                >
                  <p className="text-xs font-medium text-foreground truncate">
                    {pkg.title}
                  </p>
                  <p className="text-xs font-bold text-primary">
                    ${pkg.from_price.toFixed(0)}
                  </p>
                </button>
              ))}
              {servicePackages.length > 3 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  +{servicePackages.length - 3} more
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Products - show compact cards, scroll to highlighted group */}
      {showContent && groupKeys.slice(0, 6).map((groupName) => {
        const groupProducts = groupedProducts[groupName];
        const isGroupHighlighted = highlightedPartType && matchesPartType(groupName, highlightedPartType);
        
        return (
          <div
            key={groupName}
            ref={(el) => { groupRefs.current[groupName] = el; }}
            className={cn(
              "bg-background/95 backdrop-blur-sm rounded-lg overflow-hidden",
              "border border-border/50 shadow-md",
              isGroupHighlighted && "ring-2 ring-primary border-primary"
            )}
          >
            {/* Compact Group Header */}
            <div className={cn(
              "px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
              isGroupHighlighted ? "bg-primary text-primary-foreground" : "bg-muted/80 text-muted-foreground"
            )}>
              {groupName}
            </div>
            
            {/* Products in group - proper cards */}
            <div className="p-2 space-y-2">
              {groupProducts.slice(0, 3).map((product) => {
                const isSpotlighted = highlightedProduct && productMatchesSpotlight(product, highlightedProduct);
                
                return (
                  <Card 
                    key={product.id}
                    onClick={() => onProductClick?.(product)}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      isSpotlighted && "ring-2 ring-primary bg-primary/5"
                    )}
                  >
                    <CardHeader className="p-2">
                      <div className="aspect-square bg-muted rounded-md mb-1 flex items-center justify-center overflow-hidden">
                        <ProductImage 
                          sku={product.sku || product.id}
                          brand={product.brand}
                          alt={product.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <CardTitle className="text-xs line-clamp-2">{product.name}</CardTitle>
                      {product.brand && (
                        <p className="text-[10px] text-muted-foreground">{product.brand}</p>
                      )}
                    </CardHeader>
                    <CardContent className="p-2 pt-0">
                      <span className="text-sm font-bold text-primary">
                        {product.price > 0 ? `$${product.price.toFixed(2)}` : 'Price on request'}
                      </span>
                    </CardContent>
                    <CardFooter className="p-2 pt-0">
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onProductClick?.(product);
                        }}
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Buy Now
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
              {groupProducts.length > 3 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  +{groupProducts.length - 3} more
                </p>
              )}
            </div>
          </div>
        );
      })}
      
      {/* Show more groups indicator */}
      {showContent && groupKeys.length > 6 && (
        <div className="bg-muted/50 rounded-lg py-1.5 text-center">
          <p className="text-[10px] text-muted-foreground">
            +{groupKeys.length - 6} more categories
          </p>
        </div>
      )}
    </div>
  );
};
