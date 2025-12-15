import { useState } from "react";

interface ProductImageProps {
  sku: string;
  brand?: string;
  alt: string;
  className?: string;
}

const STORAGE_BASE = 'https://flpzjbasdsfwoeruyxgp.supabase.co/storage/v1/object/public';

export const ProductImage = ({ sku, brand, alt, className }: ProductImageProps) => {
  // Build fallback chain
  const images: string[] = [];
  
  // 1. Primary: Product image by SKU
  if (sku) {
    images.push(`${STORAGE_BASE}/product_images/${sku}.jpg`);
  }
  
  // 2. Fallback: Brand logo (remove spaces)
  if (brand) {
    images.push(`${STORAGE_BASE}/brand_images/${brand.replace(/\s+/g, '')}.jpg`);
  }
  
  // 3. Final: Local placeholder
  images.push('/placeholder.svg');
  
  const [imageIndex, setImageIndex] = useState(0);
  
  return (
    <img 
      src={images[imageIndex]}
      alt={alt}
      className={className}
      onError={() => {
        if (imageIndex < images.length - 1) {
          setImageIndex(prev => prev + 1);
        }
      }}
    />
  );
};
