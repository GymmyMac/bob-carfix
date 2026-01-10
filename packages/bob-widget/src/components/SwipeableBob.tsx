import React, { useState, useRef, useEffect, useCallback } from "react";

interface SwipeableBobProps {
  children: React.ReactNode;
  isSpeaking?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

/**
 * SwipeableBob - Phase 2: Swipeable Bob Overlay
 * 
 * Features:
 * - Swipe left to hide Bob
 * - Vertical "BOB" tab on left edge when hidden
 * - Auto-reappear when TTS starts speaking
 * - Spring animation for slide in/out
 */
export const SwipeableBob: React.FC<SwipeableBobProps> = ({
  children,
  isSpeaking = false,
  onVisibilityChange
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalSwipeRef = useRef(false);
  
  // Threshold for hiding (40% of container width)
  const HIDE_THRESHOLD = 0.4;
  // Minimum horizontal movement to consider it a swipe
  const MIN_SWIPE_DISTANCE = 30;

  // Auto-show when speaking starts
  useEffect(() => {
    if (isSpeaking && !isVisible) {
      setIsVisible(true);
      setDragOffset(0);
      onVisibilityChange?.(true);
    }
  }, [isSpeaking, isVisible, onVisibilityChange]);

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
    
    // Determine if this is a horizontal swipe on first significant movement
    if (!isHorizontalSwipeRef.current && Math.abs(deltaX) > 10) {
      // Only treat as horizontal swipe if horizontal movement is greater than vertical
      isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY);
    }
    
    // Only handle left swipes (negative deltaX) for hiding
    if (isHorizontalSwipeRef.current && deltaX < 0) {
      // Prevent default to stop page scrolling
      e.preventDefault();
      setDragOffset(deltaX);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const containerWidth = containerRef.current?.offsetWidth || 200;
    const swipePercentage = Math.abs(dragOffset) / containerWidth;
    
    if (swipePercentage > HIDE_THRESHOLD) {
      // Hide Bob
      setIsVisible(false);
      onVisibilityChange?.(false);
    }
    
    // Reset drag offset
    setDragOffset(0);
  }, [isDragging, dragOffset, onVisibilityChange]);

  const handleTabClick = useCallback(() => {
    setIsVisible(true);
    setDragOffset(0);
    onVisibilityChange?.(true);
  }, [onVisibilityChange]);

  // Calculate transform based on visibility and drag
  const getTransform = () => {
    if (!isVisible) {
      return 'translateX(-100%)';
    }
    if (isDragging && dragOffset < 0) {
      return `translateX(${dragOffset}px)`;
    }
    return 'translateX(0)';
  };

  return (
    <>
      {/* Main Bob container - swipeable, full-screen viewport layer */}
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100dvh',
          transform: getTransform(),
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          willChange: 'transform',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
        
        {/* Swipe hint indicator - shows briefly on first load */}
        {isVisible && !isDragging && (
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 animate-pulse"
            style={{
              animation: 'swipeHint 3s ease-in-out 2s 1',
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
      {!isVisible && (
        <button
          onClick={handleTabClick}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            background: 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)',
            padding: '16px 8px',
            borderTopRightRadius: '12px',
            borderBottomRightRadius: '12px',
            boxShadow: '4px 0 12px rgba(37, 99, 235, 0.3)',
            animation: 'slideInFromLeft 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
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
