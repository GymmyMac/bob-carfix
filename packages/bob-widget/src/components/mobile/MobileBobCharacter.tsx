import React from "react";

interface MobileBobCharacterProps {
  currentImage: string;
  animationState: string;
  counterOverlayUrl?: string;
  counterHeightPercent?: number;
  scale?: number;
  position?: 'center' | 'left';
  verticalOffset?: number;
}

export const MobileBobCharacter: React.FC<MobileBobCharacterProps> = ({
  currentImage,
  animationState,
  counterOverlayUrl,
  counterHeightPercent = 15,
  scale = 100,
  position = 'center',
  verticalOffset = 0
}) => {
  // ============================================================================
  // BOB v2.0 - FIXED CENTERING AND SCALE
  // ============================================================================
  
  // Base width calculation - Bob fills more of the screen in welcome state
  const baseWidth = position === 'center' ? 75 : 55; // Larger when centered
  const scaledWidth = (baseWidth * scale) / 100;
  const scaledMaxWidth = position === 'center' ? (450 * scale) / 100 : (320 * scale) / 100;
  
  // TRUE CENTERING: Use left: 50% with translateX(-50%) for perfect center
  // When showing products (left position), move Bob exactly 15px from left edge
  const getTransform = () => {
    if (position === 'center') {
      return 'translateX(-50%)'; // Perfect center
    }
    return 'translateX(0)'; // No transform when positioned left
  };
  
  const getLeftPosition = () => {
    if (position === 'center') {
      return '50%'; // Center anchor point
    }
    return '15px'; // Exactly 15px from left edge as requested
  };
  
  // Calculate bottom position including vertical offset from database
  // Bob sits above the counter
  const bottomPercent = counterHeightPercent - 2 + verticalOffset;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Bob Character - Centered properly */}
      <div 
        className="absolute z-40"
        style={{
          bottom: `${bottomPercent}%`,
          left: getLeftPosition(),
          // Prevent clipping at top while allowing Bob to be large
          maxHeight: `${100 - counterHeightPercent - 2}%`,
          transform: getTransform(),
          width: `${scaledWidth}%`,
          maxWidth: `${scaledMaxWidth}px`,
          transition: 'all 0.4s ease-out', // Smooth transitions for position changes
        }}
      >
        <img 
          src={currentImage} 
          alt={`Bob ${animationState}`} 
          className="w-full h-auto object-contain"
          style={{ display: 'block', maxHeight: '100%' }}
        />
      </div>

      {/* Counter Overlay */}
      {counterOverlayUrl && (
        <div 
          className="absolute bottom-0 left-0 right-0 z-50"
          style={{ 
            height: `${counterHeightPercent}%`,
            pointerEvents: 'none' // Allow clicks through to chat drawer
          }}
        >
          <img 
            src={counterOverlayUrl} 
            alt="Shop counter" 
            className="w-full h-full object-cover object-top"
          />
        </div>
      )}
    </div>
  );
};
