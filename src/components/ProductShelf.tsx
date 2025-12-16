import { useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Product } from "@/types/product";
import { cn } from "@/lib/utils";
import { Package, Star } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { HighlightedProduct } from "@/hooks/useBobChat";

interface ProductShelfProps {
  products: Product[];
  highlightedPartType?: string | null;
  highlightedProduct?: HighlightedProduct | null;
  onProductClick?: (product: Product) => void;
}

interface ProductGroup {
  name: string;
  products: Product[];
}

// Check if a group name matches the highlighted part type
const groupMatchesHighlight = (groupName: string, highlightType: string): boolean => {
  const searchTerms = highlightType.toLowerCase().split(' ');
  const name = groupName.toLowerCase();
  return searchTerms.every(term => name.includes(term));
};

// Check if a product matches the spotlight criteria
const productMatchesSpotlight = (product: Product, spotlight: HighlightedProduct): boolean => {
  const brandMatch = product.brand?.toLowerCase() === spotlight.brand.toLowerCase();
  const priceMatch = Math.abs(product.price - spotlight.price) < 1; // Allow $1 tolerance
  return brandMatch && priceMatch;
};

export const ProductShelf = ({ products, highlightedPartType, highlightedProduct, onProductClick }: ProductShelfProps) => {
  const highlightedRef = useRef<HTMLElement>(null);
  const spotlightedRef = useRef<HTMLDivElement>(null);
  
  // Group products by partslotDescription
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    
    products.forEach(product => {
      const key = product.partslotDescription || 'Other Parts';
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    
    // Sort group names alphabetically - stable order prevents scroll jump when highlight clears
    const sortedGroupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    
    return sortedGroupNames.map(name => ({ name, products: groups[name] }));
  }, [products]);
  
  // Auto-scroll to highlighted section
  useEffect(() => {
    if (highlightedPartType && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlightedPartType]);
  
  // Auto-scroll to spotlighted product (centered)
  useEffect(() => {
    if (highlightedProduct && spotlightedRef.current) {
      spotlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedProduct]);
  
  if (products.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <p>Ask Bob about parts for your vehicle</p>
      </div>
    );
  }

  const highlightedGroupCount = highlightedPartType 
    ? groupedProducts.filter(g => groupMatchesHighlight(g.name, highlightedPartType)).length 
    : 0;

  // Generate anchor ID from group name
  const getAnchorId = (name: string) => 
    `partslot-${name.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="w-full h-full overflow-y-auto px-4 py-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Available Parts</h2>
        <p className="text-muted-foreground">
          {products.length} part{products.length !== 1 ? 's' : ''} in {groupedProducts.length} categor{groupedProducts.length !== 1 ? 'ies' : 'y'}
          {highlightedPartType && highlightedGroupCount > 0 && (
            <span className="text-primary font-medium"> • {highlightedGroupCount} section{highlightedGroupCount !== 1 ? 's' : ''} highlighted</span>
          )}
        </p>
      </div>
      
      <div className="space-y-8">
        {groupedProducts.map(({ name, products: groupProducts }, groupIndex) => {
          const isHighlighted = highlightedPartType && groupMatchesHighlight(name, highlightedPartType);
          // Find the actual first highlighted group index (not just groupIndex === 0)
          const firstHighlightedIndex = highlightedPartType 
            ? groupedProducts.findIndex(g => groupMatchesHighlight(g.name, highlightedPartType))
            : -1;
          const isFirstHighlighted = isHighlighted && groupIndex === firstHighlightedIndex;
          
          return (
            <section 
              key={name}
              id={getAnchorId(name)}
              ref={isFirstHighlighted ? highlightedRef : undefined}
              className={cn(
                "rounded-xl transition-all",
                isHighlighted && "ring-2 ring-primary p-4 bg-primary/5 shadow-lg shadow-primary/10"
              )}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
                <Package className="h-5 w-5 text-muted-foreground" />
                {name}
                <span className="text-sm font-normal text-muted-foreground">
                  ({groupProducts.length})
                </span>
                {isHighlighted && (
                  <Badge className="bg-primary text-primary-foreground text-xs ml-2">
                    ★ Recommended
                  </Badge>
                )}
              </h3>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {groupProducts.map((product, index) => {
                  const isSpotlighted = highlightedProduct && productMatchesSpotlight(product, highlightedProduct);
                  
                  return (
                    <Card 
                      key={product.id}
                      ref={isSpotlighted ? spotlightedRef : undefined}
                      className={cn(
                        "hover:shadow-lg transition-all cursor-pointer animate-fade-in relative",
                        isSpotlighted && [
                          "scale-105 z-10",
                          "animate-spotlight-pulse",
                          "ring-4 ring-primary"
                        ]
                      )}
                      style={{ animationDelay: isSpotlighted ? '0ms' : `${index * 30}ms` }}
                      onClick={() => onProductClick?.(product)}
                    >
                      {/* Bob's Pick Badge */}
                      {isSpotlighted && (
                        <Badge className="absolute -top-3 -right-3 bg-primary text-primary-foreground text-xs px-2 py-1 z-20 animate-bounce shadow-lg">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Bob's Pick
                        </Badge>
                      )}
                      <CardHeader className="p-4">
                        <div className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center overflow-hidden">
                          <ProductImage 
                            sku={product.sku || product.id}
                            brand={product.brand}
                            alt={product.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <CardTitle className="text-base">{product.name}</CardTitle>
                        {product.brand && (
                          <p className="text-sm text-muted-foreground">{product.brand}</p>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-xs text-muted-foreground mb-2">
                          Part #: {product.partNumber}
                        </p>
                        <span className="text-lg font-bold text-primary">
                          {product.price > 0 ? `$${product.price.toFixed(2)}` : 'Price on request'}
                        </span>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Button 
                          className="w-full" 
                          size="sm"
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
    </div>
  );
};
