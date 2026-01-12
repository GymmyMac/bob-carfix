import React, { useState, useRef, useEffect, useCallback } from "react";
import type { BobPosition } from "./mobile/MobileBobCharacter";

interface SwipeableBobProps {
  children: React.ReactNode;
  isSpeaking?: boolean;
  hasProducts?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
  onPositionChange?: (position: BobPosition) => void;
  currentPosition?: BobPosition;
}

/**
 * SwipeableBob - Phase 2: Swipeable Bob Overlay with 3-Position System
 * 
 * Features:
 * - Swipe left to hide Bob (center → partial-left → hidden)
 * - Swipe right to show Bob (hidden → partial-left → center)
 * - Vertical "BOB" tab on left edge when hidden
 * - Auto-reappear when TTS starts speaking
 * - Auto-move to partial-left when products appear
 * - Spring animation for slide in/out
 */
export const SwipeableBob: React.FC<SwipeableBobProps> = ({
  children,
  isSpeaking = false,
  hasProducts = false,
  onVisibilityChange,
  onPositionChange,
  currentPosition = 'center'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalSwipeRef = useRef(false);
  
  // Thresholds for position changes
  const PARTIAL_THRESHOLD = 0.25; // 25% swipe to go to partial
  const HIDE_THRESHOLD = 0.5;     // 50% swipe to hide

  // Auto-show when speaking starts
  useEffect(() => {
    if (isSpeaking && currentPosition === 'hidden') {
      onPositionChange?.('partial-left');
      onVisibilityChange?.(true);
    }
  }, [isSpeaking, currentPosition, onPositionChange, onVisibilityChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalSwipeRef.current = false;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - startXRef.current;
    const deltaY = currentY - startYRef.current;
    
    // Determine if this is a horizontal swipe
    if (!isHorizontalSwipeRef.current && Math.abs(deltaX) > 10) {
      isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY);
    }
    
    // Handle horizontal swipes
    if (isHorizontalSwipeRef.current) {
      e.preventDefault();
      setDragOffset(deltaX);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const containerWidth = containerRef.current?.offsetWidth || 300;
    const swipePercentage = Math.abs(dragOffset) / containerWidth;
    const isLeftSwipe = dragOffset < 0;
    const isRightSwipe = dragOffset > 0;
    
    // Determine new position based on swipe direction and magnitude
    if (isLeftSwipe) {
      // Swiping left (hiding Bob)
      if (currentPosition === 'center' && swipePercentage > PARTIAL_THRESHOLD) {
        onPositionChange?.('partial-left');
        onVisibilityChange?.(true);
      } else if (currentPosition === 'partial-left' && swipePercentage > PARTIAL_THRESHOLD) {
        onPositionChange?.('hidden');
        onVisibilityChange?.(false);
      }
    } else if (isRightSwipe) {
      // Swiping right (showing Bob)
      if (currentPosition === 'hidden' && swipePercentage > PARTIAL_THRESHOLD) {
        onPositionChange?.('partial-left');
        onVisibilityChange?.(true);
      } else if (currentPosition === 'partial-left' && swipePercentage > PARTIAL_THRESHOLD && !hasProducts) {
        // Only return to center if no products
        onPositionChange?.('center');
        onVisibilityChange?.(true);
      }
    }
    
    setDragOffset(0);
  }, [isDragging, dragOffset, currentPosition, hasProducts, onPositionChange, onVisibilityChange]);

  const handleTabClick = useCallback(() => {
    onPositionChange?.('partial-left');
    onVisibilityChange?.(true);
  }, [onPositionChange, onVisibilityChange]);

  // Calculate visual offset based on drag
  const getDragTransform = () => {
    if (isDragging && dragOffset !== 0) {
      // Limit drag to prevent over-pulling
      const maxDrag = 100;
      const limitedDrag = Math.max(-maxDrag, Math.min(maxDrag, dragOffset));
      return `translateX(${limitedDrag}px)`;
    }
    return 'translateX(0)';
  };

  return (
    <>
      {/* Main container - wraps Bob and products */}
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100dvh',
          transform: getDragTransform(),
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          willChange: 'transform',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
        
        {/* Swipe hint indicator */}
        {currentPosition === 'center' && !isDragging && (
          <div 
            className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              animation: 'swipeHint 3s ease-in-out 2s 1',
              opacity: 0,
            }}
          >
            <svg 
              className="w-6 h-6 text-white/50" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 19l-7-7 7-7" 
              />
            </svg>
          </div>
        )}
      </div>
      
      {/* "BOB" tab - visible when Bob is hidden */}
      {currentPosition === 'hidden' && (
        <button
          onClick={handleTabClick}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            background: 'linear-gradient(180deg, #0066CC 0%, #004999 100%)',
            padding: '16px 8px',
            borderTopRightRadius: '12px',
            borderBottomRightRadius: '12px',
            boxShadow: '4px 0 12px rgba(0, 102, 204, 0.3)',
            animation: 'slideInFromLeft 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <span className="text-white font-bold text-lg tracking-wider">
            BOB
          </span>
        </button>
      )}
      
      {/* CSS animations */}
      <style>{`
        @keyframes slideInFromLeft {
          from {
            transform: translateX(-100%) translateY(-50%);
            opacity: 0;
          }
          to {
            transform: translateX(0) translateY(-50%);
            opacity: 1;
          }
        }
        
        @keyframes swipeHint {
          0%, 100% {
            opacity: 0;
            transform: translateX(0) translateY(-50%);
          }
          50% {
            opacity: 0.7;
            transform: translateX(-10px) translateY(-50%);
          }
        }
      `}</style>
    </>
  );
};
