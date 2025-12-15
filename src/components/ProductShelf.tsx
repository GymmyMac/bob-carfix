import { useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Product } from "@/types/product";
import { cn } from "@/lib/utils";

interface ProductShelfProps {
  products: Product[];
  highlightedPartType?: string | null;
  onProductClick?: (product: Product) => void;
}

// Check if a product matches a highlighted part type
const matchesHighlight = (product: Product, highlightType: string): boolean => {
  const searchTerms = highlightType.toLowerCase().split(' ');
  const productName = product.name.toLowerCase();
  const productBrand = (product.brand || '').toLowerCase();
  
  // Check if all words in the highlight match the product
  return searchTerms.every(term => 
    productName.includes(term) || productBrand.includes(term)
  );
};

export const ProductShelf = ({ products, highlightedPartType, onProductClick }: ProductShelfProps) => {
  const highlightedRef = useRef<HTMLDivElement>(null);
  
  // Sort products: highlighted ones first, then the rest
  const sortedProducts = useMemo(() => {
    if (!highlightedPartType) return products;
    
    const highlighted: Product[] = [];
    const others: Product[] = [];
    
    products.forEach(product => {
      if (matchesHighlight(product, highlightedPartType)) {
        highlighted.push(product);
      } else {
        others.push(product);
      }
    });
    
    return [...highlighted, ...others];
  }, [products, highlightedPartType]);
  
  // Auto-scroll to highlighted products
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

  const highlightedCount = highlightedPartType 
    ? products.filter(p => matchesHighlight(p, highlightedPartType)).length 
    : 0;

  return (
    <div className="w-full h-full overflow-y-auto px-4 py-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Available Parts</h2>
        <p className="text-muted-foreground">
          {products.length} part{products.length !== 1 ? 's' : ''} found for your vehicle
          {highlightedPartType && highlightedCount > 0 && (
            <span className="text-primary font-medium"> • {highlightedCount} {highlightedPartType} highlighted</span>
          )}
        </p>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedProducts.map((product, index) => {
          const isHighlighted = highlightedPartType && matchesHighlight(product, highlightedPartType);
          const isFirstHighlighted = isHighlighted && index === 0;
          
          return (
            <Card 
              key={product.id}
              ref={isFirstHighlighted ? highlightedRef : undefined}
              className={cn(
                "hover:shadow-lg transition-all cursor-pointer animate-fade-in",
                isHighlighted && "ring-2 ring-primary shadow-lg shadow-primary/20"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => onProductClick?.(product)}
            >
              <CardHeader className="p-4">
                <div className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center overflow-hidden relative">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  {isHighlighted && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        ★ Recommended
                      </Badge>
                    </div>
                  )}
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
    </div>
  );
};
