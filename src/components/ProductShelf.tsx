import { useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Product } from "@/types/product";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";

interface ProductShelfProps {
  products: Product[];
  highlightedPartType?: string | null;
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

export const ProductShelf = ({ products, highlightedPartType, onProductClick }: ProductShelfProps) => {
  const highlightedRef = useRef<HTMLElement>(null);
  
  // Group products by partslotDescription
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    
    products.forEach(product => {
      const key = product.partslotDescription || 'Other Parts';
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    
    // Sort group names alphabetically, but highlighted first
    const sortedGroupNames = Object.keys(groups).sort((a, b) => {
      if (highlightedPartType) {
        const aMatches = groupMatchesHighlight(a, highlightedPartType);
        const bMatches = groupMatchesHighlight(b, highlightedPartType);
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
      }
      return a.localeCompare(b);
    });
    
    return sortedGroupNames.map(name => ({ name, products: groups[name] }));
  }, [products, highlightedPartType]);
  
  // Auto-scroll to highlighted section
  useEffect(() => {
    if (highlightedPartType && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlightedPartType]);
  
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
          const isFirstHighlighted = isHighlighted && groupIndex === 0;
          
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
                {groupProducts.map((product, index) => (
                  <Card 
                    key={product.id}
                    className="hover:shadow-lg transition-all cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                    onClick={() => onProductClick?.(product)}
                  >
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
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
