import { Product } from "@/types/product";
import { ServicePackage } from "@/types/servicePackage";
import { ProductImage } from "@/components/ProductImage";
import { Badge } from "@/components/ui/badge";
import { Package, ChevronDown, ChevronUp } from "lucide-react";
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
}

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
  counterHeightPercent = 22
}: MobileProductColumnProps) => {
  const [showPackages, setShowPackages] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const spotlightedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to spotlighted product
  useEffect(() => {
    if (highlightedProduct && spotlightedRef.current && scrollRef.current) {
      spotlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedProduct]);

  const hasContent = products.length > 0 || servicePackages.length > 0;
  const showLoading = isResearching;
  const showContent = hasContent && !isResearching;

  // Always render the container - use CSS for visibility
  // This prevents unmounting/remounting flicker
  return (
    <div 
      ref={scrollRef}
      className={cn(
        "absolute right-2 top-4 w-[45%] max-w-[200px]",
        "overflow-y-auto overflow-x-hidden z-40", // z-40 to be above chat drawer (z-30)
        "flex flex-col gap-2 pb-4",
        "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
        "transition-all duration-300 ease-out",
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 pointer-events-none"
      )}
      style={{
        // Safe area for notches
        paddingTop: 'env(safe-area-inset-top, 4px)',
        // Position above counter AND above chat drawer
        bottom: `calc(${counterHeightPercent + 4}% + ${CHAT_DRAWER_HEIGHT}px)`
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

      {/* Products */}
      {showContent && products.slice(0, 8).map((product, index) => {
        const isSpotlighted = highlightedProduct && productMatchesSpotlight(product, highlightedProduct);
        const isHighlighted = highlightedPartType && 
          product.partslotDescription?.toLowerCase().includes(highlightedPartType.toLowerCase());
        
        return (
          <div
            key={product.id}
            ref={isSpotlighted ? spotlightedRef : undefined}
            onClick={() => onProductClick?.(product)}
            className={cn(
              "bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg",
              "p-2 cursor-pointer transition-all duration-200",
              "hover:scale-[1.02] active:scale-[0.98]",
              isSpotlighted && "ring-2 ring-primary border-primary animate-pulse",
              isHighlighted && "border-primary/50 bg-primary/5",
              !isSpotlighted && !isHighlighted && "border-border"
            )}
            style={{ 
              animationDelay: `${index * 50}ms`,
              animation: 'fade-in 0.3s ease-out forwards'
            }}
          >
            {/* Bob's Pick Badge */}
            {isSpotlighted && (
              <Badge className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 z-10">
                ★ Pick
              </Badge>
            )}
            
            {/* Product Image - compact */}
            <div className="aspect-square bg-muted rounded-md mb-1.5 overflow-hidden">
              <ProductImage 
                sku={product.sku || product.id}
                brand={product.brand}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            </div>
            
            {/* Product Info - compact */}
            <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight mb-0.5">
              {product.name}
            </p>
            {product.brand && (
              <p className="text-[10px] text-muted-foreground truncate">
                {product.brand}
              </p>
            )}
            <p className="text-sm font-bold text-primary mt-1">
              ${product.price.toFixed(0)}
            </p>
          </div>
        );
      })}
      
      {/* More products indicator */}
      {showContent && products.length > 8 && (
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <p className="text-xs text-muted-foreground">
            +{products.length - 8} more parts
          </p>
        </div>
      )}
    </div>
  );
};
