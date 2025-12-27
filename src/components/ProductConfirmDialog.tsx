import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ProductImage";
import { Product } from "@/types/product";
import { Minus, Plus, ShoppingCart } from "lucide-react";

interface ProductConfirmDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (product: Product, quantity: number) => void;
}

export const ProductConfirmDialog = ({
  product,
  open,
  onOpenChange,
  onConfirm,
}: ProductConfirmDialogProps) => {
  const [quantity, setQuantity] = useState(1);

  // Reset quantity when dialog opens with new product
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setQuantity(1);
    }
    onOpenChange(isOpen);
  };

  if (!product) return null;

  const handleConfirm = () => {
    onConfirm(product, quantity);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Cart</DialogTitle>
          <DialogDescription>
            Confirm the product and quantity you'd like to add
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 py-4">
          {/* Product Image */}
          <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            <ProductImage
              sku={product.sku || product.id}
              brand={product.brand}
              alt={product.name}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {product.name}
            </h3>
            {product.brand && (
              <p className="text-sm text-muted-foreground">{product.brand}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Part #: {product.partNumber}
            </p>
            <p className="text-lg font-bold text-primary mt-2">
              ${product.price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="flex items-center justify-between py-2 border-t border-border">
          <span className="text-sm font-medium text-foreground">Quantity</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-medium">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between py-2 border-t border-border">
          <span className="text-sm font-medium text-foreground">Total</span>
          <span className="text-lg font-bold text-primary">
            ${(product.price * quantity).toFixed(2)}
          </span>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Add via Bob
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
