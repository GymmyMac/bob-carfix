import React from "react";
import type { Product } from "../types";

interface ProductTileProps {
  product: Product;
  isSpotlighted?: boolean;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

/**
 * ProductTile - Phase 4: Full-Width Glass Product Tiles
 * 
 * Design specs:
 * - Full viewport width (80% of mobile screen)
 * - Glass-morphism with backdrop blur
 * - Layout: Image left, details middle, "Add" button right
 * - "Bob's Pick" spotlight badge for recommended products
 * - CARFIX brand colours (blue primary, orange accents)
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
        // Enhanced glass-morphism styling
        background: isSpotlighted 
          ? 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(239,246,255,0.92) 100%)'
          : 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '20px',
        border: isSpotlighted 
          ? '2px solid rgba(0, 102, 204, 0.5)' 
          : '1px solid rgba(255, 255, 255, 0.4)',
        boxShadow: isSpotlighted
          ? '0 8px 32px -4px rgba(0, 102, 204, 0.25), 0 4px 12px -2px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255,255,255,0.3)'
          : '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 0 0 1px rgba(255,255,255,0.2)',
        padding: '14px',
      }}
    >
      {/* Bob's Pick Badge - CARFIX Blue */}
      {isSpotlighted && (
        <div 
          className="absolute -top-2.5 -right-2.5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
          style={{
            background: 'linear-gradient(135deg, #0066CC 0%, #004999 100%)',
            boxShadow: '0 4px 12px -2px rgba(0, 102, 204, 0.4)',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Bob's Pick
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Product Image */}
        <div 
          className="flex-shrink-0 flex items-center justify-center rounded-2xl overflow-hidden"
          style={{
            width: '88px',
            height: '88px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid rgba(0, 102, 204, 0.1)',
          }}
        >
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-full h-full object-contain p-2"
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
          {/* Product Name - Bold typography */}
          <p 
            className="font-bold text-gray-900 line-clamp-2 leading-tight"
            style={{ 
              fontSize: '15px',
              letterSpacing: '-0.01em',
            }}
          >
            {product.name}
          </p>
          
          {/* Brand Badge - CARFIX Blue */}
          {product.brand && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span 
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md"
                style={{
                  background: 'rgba(0, 102, 204, 0.1)',
                  color: '#0066CC',
                }}
              >
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {product.brand}
              </span>
            </div>
          )}
          
          {/* Price - Bold, CARFIX Blue */}
          <p 
            className="font-extrabold mt-2"
            style={{ 
              fontSize: '20px',
              color: '#0066CC',
              letterSpacing: '-0.02em',
            }}
          >
            {product.price > 0 ? `$${product.price.toFixed(2)}` : 'POA'}
          </p>
        </div>

        {/* Add Button - CARFIX Orange */}
        <button
          onClick={handleAddClick}
          className="flex-shrink-0 flex items-center justify-center rounded-2xl transition-all duration-200 active:scale-95"
          style={{
            width: '52px',
            height: '52px',
            background: 'linear-gradient(135deg, #FF9500 0%, #E68600 100%)',
            boxShadow: '0 4px 14px -2px rgba(255, 149, 0, 0.4)',
            border: 'none',
          }}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Part Type Tag */}
      {product.partslotDescription && (
        <div 
          className="mt-3 pt-3"
          style={{ borderTop: '1px solid rgba(0, 102, 204, 0.1)' }}
        >
          <span 
            className="text-xs font-medium"
            style={{ color: '#0066CC', opacity: 0.7 }}
          >
            {product.partslotDescription}
          </span>
        </div>
      )}
    </div>
  );
};
