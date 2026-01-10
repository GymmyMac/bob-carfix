import React, { useEffect, useState, useCallback } from "react";
import type { SparkDeal } from "../hooks/useSparkDeals";
import type { MatrixTheme } from "../hooks/useThemeSettings";

interface SparkDealBannerProps {
  deals: SparkDeal[];
  currentDealIndex: number;
  onDealChange: (index: number) => void;
  onDealClick: (deal: SparkDeal) => void;
  scrollSpeed: number;
  theme: Partial<MatrixTheme>;
}

export const SparkDealBanner: React.FC<SparkDealBannerProps> = ({
  deals,
  currentDealIndex,
  onDealChange,
  onDealClick,
  scrollSpeed,
  theme,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [translateX, setTranslateX] = useState(100); // Start off-screen right

  const currentDeal = deals[currentDealIndex];
  const sparkDealColor = theme.sparkDealHex || '#FF9500';
  const isDarkMode = theme.backgroundMode !== 'light';

  // Animate deal in from right, then out to left
  useEffect(() => {
    if (!currentDeal) return;

    // Start animation
    setIsAnimating(true);
    setTranslateX(100);

    // Slide in
    const slideInTimer = setTimeout(() => {
      setTranslateX(0);
    }, 50);

    // Hold in center, then slide out
    const slideOutTimer = setTimeout(() => {
      setTranslateX(-100);
    }, scrollSpeed - 500);

    // Move to next deal
    const nextDealTimer = setTimeout(() => {
      const nextIndex = (currentDealIndex + 1) % deals.length;
      onDealChange(nextIndex);
      setIsAnimating(false);
    }, scrollSpeed);

    return () => {
      clearTimeout(slideInTimer);
      clearTimeout(slideOutTimer);
      clearTimeout(nextDealTimer);
    };
  }, [currentDealIndex, currentDeal, scrollSpeed, deals.length, onDealChange]);

  const handleClick = useCallback(() => {
    if (currentDeal) {
      onDealClick(currentDeal);
    }
  }, [currentDeal, onDealClick]);

  if (!currentDeal) return null;

  const discount = currentDeal.original_price 
    ? Math.round((1 - currentDeal.price / currentDeal.original_price) * 100)
    : null;

  return (
    <div 
      className="absolute bottom-20 left-0 right-0 z-20 overflow-hidden pointer-events-none"
      style={{ height: '72px' }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-auto"
        style={{
          transform: `translateX(${translateX}%)`,
          transition: 'transform 0.5s ease-out',
        }}
      >
        <button
          onClick={handleClick}
          className="group flex items-center gap-4 px-6 py-3 rounded-xl shadow-2xl transition-all hover:scale-105 active:scale-95"
          style={{
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(17, 24, 39, 0.9) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.98) 100%)',
            border: `2px solid ${sparkDealColor}`,
            boxShadow: `0 8px 32px -4px ${sparkDealColor}40, 0 4px 16px -2px rgba(0,0,0,0.2)`,
          }}
        >
          {/* Spark icon */}
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: `${sparkDealColor}20` }}
          >
            <svg 
              className="w-5 h-5" 
              fill={sparkDealColor} 
              viewBox="0 0 24 24"
            >
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          </div>

          {/* Deal content */}
          <div className="flex flex-col items-start min-w-0">
            <div className="flex items-center gap-2">
              <span 
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: sparkDealColor }}
              >
                ⚡ Spark Deal
              </span>
              {discount && discount > 0 && (
                <span 
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ 
                    background: sparkDealColor, 
                    color: isDarkMode ? '#000' : '#fff' 
                  }}
                >
                  {discount}% OFF
                </span>
              )}
            </div>
            <p 
              className="text-sm font-semibold truncate max-w-[200px]"
              style={{ color: isDarkMode ? '#fff' : '#111827' }}
            >
              {currentDeal.brand} {currentDeal.product_name}
            </p>
          </div>

          {/* Price */}
          <div className="flex flex-col items-end shrink-0">
            {currentDeal.original_price && currentDeal.original_price > currentDeal.price && (
              <span 
                className="text-xs line-through"
                style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
              >
                ${currentDeal.original_price.toFixed(2)}
              </span>
            )}
            <span 
              className="text-xl font-bold"
              style={{ color: sparkDealColor }}
            >
              ${currentDeal.price.toFixed(2)}
            </span>
          </div>

          {/* Arrow indicator */}
          <svg 
            className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" 
            fill="none" 
            stroke={sparkDealColor}
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Deal dots indicator */}
      {deals.length > 1 && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1.5">
          {deals.map((_, idx) => (
            <div
              key={idx}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                background: idx === currentDealIndex ? sparkDealColor : `${sparkDealColor}40`,
                transform: idx === currentDealIndex ? 'scale(1.3)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SparkDealBanner;
