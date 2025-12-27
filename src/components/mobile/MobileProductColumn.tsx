import { Product } from "@/types/product";
import { ServicePackage } from "@/types/servicePackage";
import { ProductImage } from "@/components/ProductImage";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Star } from "lucide-react";
import { useRef, useEffect, useMemo } from "react";
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
  hasVehicle?: boolean;
}

// Flexible matching: handles plurals and word variations
const matchesPartType = (description: string, partType: string): boolean => {
  if (!description || !partType) return false;
  const desc = description.toLowerCase();
  const baseTerms = partType.toLowerCase()
    .replace(/s\b/g, '')
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

// Removed CHAT_DRAWER_HEIGHT - column sits above counter, not chat drawer

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<HTMLElement>(null);
  const spotlightedRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Record<string, HTMLElement | null>>({});

  // Group products by partslotDescription - matching ProductShelf exactly
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    
    products.forEach(product => {
      const key = product.partslotDescription || 'Other Parts';
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    
    // Sort group names alphabetically for stable order
    const sortedGroupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    
    return sortedGroupNames.map(name => ({ name, products: groups[name] }));
  }, [products]);

  // Debug logging
  useEffect(() => {
    console.log('[MobileProductColumn] highlightedPartType:', highlightedPartType);
    console.log('[MobileProductColumn] groups:', groupedProducts.map(g => g.name));
  }, [highlightedPartType, groupedProducts]);

  // Auto-scroll to highlighted section
  useEffect(() => {
    if (highlightedPartType) {
      const matchingGroup = groupedProducts.find(g => matchesPartType(g.name, highlightedPartType));
      console.log('[MobileProductColumn] Scroll to:', matchingGroup?.name);
      
      if (matchingGroup && groupRefs.current[matchingGroup.name]) {
        groupRefs.current[matchingGroup.name]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [highlightedPartType, groupedProducts]);

  // Auto-scroll to spotlighted product
  useEffect(() => {
    if (highlightedProduct && spotlightedRef.current) {
      spotlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedProduct]);

  const hasContent = products.length > 0 || servicePackages.length > 0;
  const showLoading = isResearching;
  const showContent = hasContent && !isResearching;
  // Maximize vertical space - just below vehicle bar or near top
  const topOffset = hasVehicle ? '56px' : '8px';

  return (
    <div 
      ref={scrollRef}
      className={cn(
        "absolute right-2 w-[45%] max-w-[200px]",
        "overflow-y-auto overflow-x-hidden z-40",
        "flex flex-col gap-3 pb-4",
        "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
        "transition-all duration-300 ease-out",
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 pointer-events-none"
      )}
      style={{
        top: topOffset,
        bottom: `calc(${counterHeightPercent}% + 16px)`,
        paddingTop: 'env(safe-area-inset-top, 4px)'
      }}
    >
      {/* Loading state */}
      {showLoading && (
        <div className="rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Finding parts...</span>
          </div>
        </div>
      )}

      {/* Service Packages - compact display */}
      {showContent && servicePackages.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-primary flex items-center gap-1 px-1">
            <Package className="h-3 w-3" />
            Service Packages
          </div>
          {servicePackages.map((pkg) => (
            <Card
              key={pkg.id}
              onClick={() => onPackageSelect?.(pkg)}
              className="cursor-pointer hover:shadow-md transition-all bg-transparent"
            >
              <CardContent className="p-2">
                <p className="text-xs font-medium line-clamp-1">{pkg.title}</p>
                <p className="text-sm font-bold text-primary">${pkg.from_price.toFixed(0)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Products - ALL groups, ALL products, transparent cards */}
      {showContent && groupedProducts.map(({ name, products: groupProducts }, groupIndex) => {
        const isHighlighted = highlightedPartType && matchesPartType(name, highlightedPartType);
        const firstHighlightedIndex = highlightedPartType 
          ? groupedProducts.findIndex(g => matchesPartType(g.name, highlightedPartType))
          : -1;
        const isFirstHighlighted = isHighlighted && groupIndex === firstHighlightedIndex;
        
        return (
          <section 
            key={name}
            ref={(el) => { 
              groupRefs.current[name] = el;
              if (isFirstHighlighted) highlightedRef.current = el;
            }}
            className={cn(
              "rounded-lg transition-all border border-transparent",
              isHighlighted && "ring-2 ring-primary p-2 bg-primary/10 shadow-lg shadow-primary/20"
            )}
          >
            {/* Group Header */}
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1 px-1 text-foreground">
              <Package className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{name}</span>
              <span className="text-[10px] text-muted-foreground">({groupProducts.length})</span>
              {isHighlighted && (
                <Badge className="bg-primary text-primary-foreground text-[8px] px-1 py-0 ml-1">
                  ★
                </Badge>
              )}
            </h3>
            
            {/* Product Cards - show ALL, no slice */}
            <div className="space-y-2">
              {groupProducts.map((product, index) => {
                const isSpotlighted = highlightedProduct && productMatchesSpotlight(product, highlightedProduct);
                
                return (
                  <Card 
                    key={`${product.id}-${index}`}
                    ref={isSpotlighted ? spotlightedRef : undefined}
                    onClick={() => onProductClick?.(product)}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md bg-transparent relative",
                      "border border-border/30",
                      isSpotlighted && "ring-4 ring-primary animate-spotlight-pulse scale-105 z-10"
                    )}
                  >
                    {/* Bob's Pick Badge */}
                    {isSpotlighted && (
                      <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[8px] px-1 py-0.5 z-20">
                        <Star className="h-2 w-2 mr-0.5 fill-current" />
                        Pick
                      </Badge>
                    )}
                    <CardHeader className="p-2">
                      <div className="aspect-square bg-muted/50 rounded-md mb-1 flex items-center justify-center overflow-hidden">
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
                        Buy Now
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
