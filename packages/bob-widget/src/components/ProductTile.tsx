import React, { useState } from "react";
import type { Product } from "../types";
import { 
  glassCard, 
  glassCardPremium, 
  glassButtonPrimary, 
  glassImageContainer,
  glassBadge,
  glassText 
} from "../styles/glass";

interface ProductTileProps {
  product: Product;
  isSpotlighted?: boolean;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

/**
 * ProductTile - Premium Glassmorphism Product Cards
 * 
 * iOS 26-inspired liquid glass design:
 * - Frosted translucent glass with backdrop blur
 * - Sharp white text with high contrast
 * - CARFIX orange price highlights
 * - Hover: scale(1.04), translateY(-4px), enhanced glow
 */
export const ProductTile: React.FC<ProductTileProps> = ({
  product,
  isSpotlighted = false,
  onProductClick,
  onAddToCart
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = () => {
    onProductClick?.(product);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(product);
  };

  // Base glass style or premium variant
  const baseGlass = isSpotlighted ? glassCardPremium : glassCard;

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full cursor-pointer glass-card"
      style={{
        ...baseGlass,
        padding: '16px',
        // Hover transform
        transform: isHovered ? 'scale(1.04) translateY(-4px)' : 'scale(1) translateY(0)',
        boxShadow: isHovered 
          ? '0 16px 56px rgba(0, 0, 0, 0.4), 0 0 24px rgba(255,255,255,0.08)'
          : baseGlass.boxShadow,
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease-out',
      }}
    >
      {/* Bob's Pick Badge - Premium glass badge */}
      {isSpotlighted && (
        <div 
          className="absolute -top-2.5 -right-2.5 z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 102, 204, 0.95) 0%, rgba(0, 73, 153, 1) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '20px',
            boxShadow: '0 8px 24px rgba(0, 102, 204, 0.5)',
            color: 'white',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Bob's Pick
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Product Image - Inner glass container */}
        <div 
          className="flex-shrink-0 flex items-center justify-center overflow-hidden"
          style={{
            ...glassImageContainer,
            width: '92px',
            height: '92px',
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
            <div className="flex flex-col items-center justify-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          {/* Product Name - Sharp white text */}
          <p 
            className="font-bold line-clamp-2 leading-tight"
            style={{ 
              fontSize: '16px',
              letterSpacing: '-0.01em',
              ...glassText.primary,
            }}
          >
            {product.name}
          </p>
          
          {/* Brand Badge - Glass style */}
          {product.brand && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span 
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5"
                style={{
                  ...glassBadge,
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {product.brand}
              </span>
            </div>
          )}
          
          {/* Price - Gold for high contrast on dark glass */}
          <p 
            className="font-extrabold mt-2"
            style={{ 
              fontSize: '22px',
              letterSpacing: '-0.02em',
              color: '#FFD700',
              textShadow: '0 2px 6px rgba(0, 0, 0, 0.5), 0 0 12px rgba(255, 215, 0, 0.3)',
            }}
          >
            {product.price > 0 ? `$${product.price.toFixed(2)}` : 'POA'}
          </p>
        </div>

        {/* Add Button - Premium glass with orange glow */}
        <button
          onClick={handleAddClick}
          className="flex-shrink-0 flex items-center justify-center glass-button"
          style={{
            ...glassButtonPrimary,
            width: '56px',
            height: '56px',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 14px 48px rgba(255, 149, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = glassButtonPrimary.boxShadow as string;
          }}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Part Type Tag - Subtle glass divider */}
      {product.partslotDescription && (
        <div 
          className="mt-3 pt-3"
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}
        >
          <span 
            className="text-xs font-medium"
            style={{ color: 'rgba(255, 255, 255, 0.6)' }}
          >
            {product.partslotDescription}
          </span>
        </div>
      )}
    </div>
  );
};
