import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Product } from "@/types/product";

interface ProductShelfProps {
  products: Product[];
  onProductClick?: (product: Product) => void;
}

export const ProductShelf = ({ products, onProductClick }: ProductShelfProps) => {
  if (products.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <p>Ask Bob about parts for your vehicle</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto px-4 py-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Available Parts</h2>
        <p className="text-muted-foreground">
          {products.length} part{products.length !== 1 ? 's' : ''} found for your vehicle
        </p>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product, index) => (
          <Card 
            key={product.id} 
            className="hover:shadow-lg transition-all cursor-pointer animate-fade-in"
            style={{ animationDelay: `${index * 75}ms` }}
            onClick={() => onProductClick?.(product)}
          >
            <CardHeader className="p-4">
              <div className="aspect-square bg-muted rounded-md mb-2 flex items-center justify-center overflow-hidden">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover"
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
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-primary">
                  {product.price > 0 ? `$${product.price.toFixed(2)}` : 'Price on request'}
                </span>
                {product.inStock ? (
                  <Badge variant="default" className="bg-green-500">In Stock</Badge>
                ) : (
                  <Badge variant="secondary">Out of Stock</Badge>
                )}
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button 
                className="w-full" 
                size="sm"
                disabled={!product.inStock}
              >
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};
