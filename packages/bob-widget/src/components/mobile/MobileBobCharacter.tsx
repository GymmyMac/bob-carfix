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
  // Reduced base width from 85% to 65% for better fit
  const scaledWidth = (65 * scale) / 100;
  const scaledMaxWidth = (320 * scale) / 100;
  
  // Better centering: center position moves Bob more to middle, left moves him further left
  const translateX = position === 'center' ? '5%' : '-25%';
  
  // Calculate bottom position including vertical offset from database
  const bottomPercent = counterHeightPercent - 2 + verticalOffset;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Bob Character */}
      <div 
        className="absolute left-0 z-40"
        style={{
          bottom: `${bottomPercent}%`,
          // Add max-height to prevent clipping at top
          maxHeight: `${100 - counterHeightPercent - 5}%`,
          transform: `translateX(${translateX})`,
          width: `${scaledWidth}%`,
          maxWidth: `${scaledMaxWidth}px`,
          transition: 'transform 0.4s ease-out',
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
