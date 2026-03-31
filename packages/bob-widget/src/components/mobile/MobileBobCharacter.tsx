import React from "react";
import { usePositionFactors } from "../../hooks/usePositionFactors";

export type BobPosition = 'center' | 'partial-left' | 'hidden';

interface MobileBobCharacterProps {
  currentImage: string;
  animationState: string;
  counterOverlayUrl?: string;
  counterHeightPercent?: number;
  scale?: number;
  position?: BobPosition;
  verticalOffset?: number;
  /** Theatrical entrance - controls fade-in opacity */
  hasArrived?: boolean;
}

/**
 * MobileBobCharacter - Bob with 3-position system
 * 
 * Positions:
 * - center: Bob centered on screen (welcome/idle state)
 * - partial-left: Bob slides left, ~30% visible (products displayed)
 * - hidden: Bob fully off-screen left (user swiped, full product view)
 */
export const MobileBobCharacter: React.FC<MobileBobCharacterProps> = ({
  currentImage,
  animationState,
  counterOverlayUrl,
  counterHeightPercent = 15,
  scale = 100,
  position = 'center',
  verticalOffset = 0,
  hasArrived = true
}) => {
  const factors = usePositionFactors();
  
  // ============================================================================
  // BOB v3.0 - 3-POSITION SYSTEM WITH RESPONSIVE SCALING
  // ============================================================================
  
  // Bob maintains consistent size - only position changes
  const baseWidth = 95;
  const scaledWidth = (baseWidth * scale) / 100;
  const scaledMaxWidth = (550 * scale) / 100;
  
  /**
   * Get Bob's left position based on current state.
   * Uses position factors for responsive behavior across devices.
   */
  const getLeftPosition = (): string => {
    switch (position) {
      case 'center':
        return '50%';
      case 'partial-left':
        // Apply factor to partial position
        return `${factors.partialLeftPosition}%`;
      case 'hidden':
        // Apply factor to hidden position
        return `${factors.hiddenPosition}%`;
      default:
        return '50%';
    }
  };
  
  /**
   * Get CSS transform based on position.
   * Center uses translateX(-50%) for true centering.
   */
  const getTransform = (): string => {
    if (position === 'center') {
      return 'translateX(-50%)';
    }
    return 'translateX(0)';
  };
  
  // Calculate bottom position - v3.1.10: Fixed formula to align with counter
  // Bob stands ON the counter, not below it
  const bottomPercent = counterHeightPercent + verticalOffset;
  
  // Transition timing - faster for hidden/show, smoother for positioning
  const getTransition = (): string => {
    if (position === 'hidden') {
      return 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
    }
    return 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'; // Spring effect
  };
  
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible', zIndex: 60 }}>
      {/* Bob Character - 3-position system — inline zIndex to beat widget CSS reset */}
      <div 
        className="absolute"
        style={{
          zIndex: 60,
          bottom: `${bottomPercent}%`,
          left: getLeftPosition(),
          maxHeight: `${100 - counterHeightPercent - 2}%`,
          transform: getTransform(),
          width: `${scaledWidth}%`,
          maxWidth: `${scaledMaxWidth}px`,
          transition: getTransition() + ', opacity 0.6s ease-out',
          willChange: 'transform, left, opacity',
          opacity: hasArrived ? 1 : 0,
        }}
      >
        <img 
          src={currentImage} 
          alt={`Bob ${animationState}`} 
          className="w-full h-auto object-contain"
          style={{ display: 'block', maxHeight: '100%', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' } as React.CSSProperties}
          draggable={false}
        />
      </div>

      {/* Counter Overlay - v3.1.15: Use object-fill to stretch to configured height */}
      {counterOverlayUrl && (
        <div 
          className="absolute bottom-0 left-0 right-0"
          style={{ 
            height: `${counterHeightPercent}%`,
            pointerEvents: 'none'
          }}
        >
          <img 
            src={counterOverlayUrl} 
            alt="Shop counter" 
            className="w-full h-full"
            style={{ objectFit: 'fill', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' } as React.CSSProperties}
            draggable={false}
          />
        </div>
      )}
    </div>
  );
};
