import React from "react";

interface BobCharacterProps {
  currentImage: string;
  animationState: string;
  backdropUrl?: string;
  counterOverlayUrl?: string;
  counterHeightPercent?: number;
  className?: string;
  verticalOffset?: number;
  scale?: number;
}

export const BobCharacter: React.FC<BobCharacterProps> = ({
  currentImage,
  animationState,
  backdropUrl,
  counterOverlayUrl,
  counterHeightPercent = 12,
  className = "",
  verticalOffset = 0,
  scale = 100
}) => {
  const bobBottomPercent = verticalOffset + counterHeightPercent;
  const scaledWidth = 55 * (scale / 100);

  return (
    <div className={`flex flex-col items-center justify-center gap-6 w-full ${className}`}>
      <div className="relative w-full max-w-[600px] mx-auto aspect-[16/10] overflow-hidden">
        {/* Layer 1: Wall Background (z-0) */}
        {backdropUrl && (
          <img 
            src={backdropUrl} 
            alt="Backdrop" 
            className="absolute inset-0 z-0 w-full h-full object-cover object-bottom"
          />
        )}
        
        {/* Layer 2: Bob (z-10) */}
        <img 
          src={currentImage} 
          alt={`Bob ${animationState}`} 
          className="absolute z-10 h-auto object-contain left-1/2 -translate-x-1/2"
          style={{ 
            bottom: `${bobBottomPercent}%`,
            width: `${scaledWidth}%`,
            maxWidth: `${220 * (scale / 100)}px`,
            transformOrigin: 'center bottom'
          }}
        />

        {/* Layer 3: Counter Overlay (z-20) */}
        {counterOverlayUrl && (
          <img 
            src={counterOverlayUrl}
            alt="Counter"
            className="absolute z-20 bottom-0 left-0 w-full object-cover object-bottom"
            style={{ height: `${counterHeightPercent}%` }}
          />
        )}
      </div>
    </div>
  );
};
