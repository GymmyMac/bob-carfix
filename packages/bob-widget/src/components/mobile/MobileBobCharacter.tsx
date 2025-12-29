import React from "react";

interface MobileBobCharacterProps {
  currentImage: string;
  animationState: string;
  counterOverlayUrl?: string;
  counterHeightPercent?: number;
  scale?: number;
  position?: 'center' | 'left';
}

export const MobileBobCharacter: React.FC<MobileBobCharacterProps> = ({
  currentImage,
  animationState,
  counterOverlayUrl,
  counterHeightPercent = 15,
  scale = 100,
  position = 'center'
}) => {
  const scaledWidth = (85 * scale) / 100;
  const scaledMaxWidth = (400 * scale) / 100;
  
  const translateX = position === 'center' ? '-20%' : '-35%';
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Bob Character */}
      <div 
        className="absolute left-0 z-40"
        style={{
          bottom: `${counterHeightPercent - 2}%`,
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
          style={{ display: 'block' }}
        />
      </div>

      {/* Counter Overlay */}
      {counterOverlayUrl && (
        <div 
          className="absolute bottom-0 left-0 right-0 z-50"
          style={{ height: `${counterHeightPercent}%` }}
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
