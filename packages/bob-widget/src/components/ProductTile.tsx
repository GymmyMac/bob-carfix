import React from "react";
import type { Product } from "../types";

interface ProductTileProps {
  product: Product;
  isSpotlighted?: boolean;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

/**
 * ProductTile - Phase 4: Full-Width Translucent Product Tiles
 * 
 * Design specs:
 * - Full viewport width
 * - Translucent white background with backdrop blur
 * - Layout: Image left (96x96), details middle, "Add" button right
 * - "Bob's Pick" spotlight badge for recommended products
 */
export const ProductTile: React.FC<ProductTileProps> = ({
  product,
  isSpotlighted = false,
  onProductClick,
  onAddToCart
}) => {
  const handleClick = () => {
    onProductClick?.(product);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(product);
  };

  return (
    <div
      onClick={handleClick}
      className="relative w-full cursor-pointer transition-all duration-200 active:scale-[0.98]"
      style={{
        background: isSpotlighted 
          ? 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(239,246,255,0.95) 100%)'
          : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: isSpotlighted 
          ? '2px solid rgba(59, 130, 246, 0.5)' 
          : '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: isSpotlighted
          ? '0 8px 32px -4px rgba(59, 130, 246, 0.25), 0 4px 12px -2px rgba(0, 0, 0, 0.08)'
          : '0 4px 16px -2px rgba(0, 0, 0, 0.1), 0 2px 8px -2px rgba(0, 0, 0, 0.06)',
        padding: '12px',
      }}
    >
      {/* Bob's Pick Badge */}
      {isSpotlighted && (
        <div 
          className="absolute -top-2 -right-2 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white"
          style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            boxShadow: '0 4px 12px -2px rgba(37, 99, 235, 0.4)',
          }}
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Bob's Pick
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Product Image */}
        <div 
          className="flex-shrink-0 flex items-center justify-center rounded-xl overflow-hidden"
          style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          }}
        >
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-full h-full object-contain p-1"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
            {product.name}
          </p>
          
          {product.brand && (
            <div className="flex items-center gap-1 mt-1">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100/80 px-1.5 py-0.5 rounded">
                {product.brand}
              </span>
            </div>
          )}
          
          <p className="text-lg font-bold text-blue-600 mt-1">
            {product.price > 0 ? `$${product.price.toFixed(2)}` : 'POA'}
          </p>
        </div>

        {/* Add Button */}
        <button
          onClick={handleAddClick}
          className="flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95"
          style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            boxShadow: '0 4px 12px -2px rgba(37, 99, 235, 0.3)',
          }}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Part Type Tag */}
      {product.partslotDescription && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            {product.partslotDescription}
          </span>
        </div>
      )}
    </div>
  );
};
