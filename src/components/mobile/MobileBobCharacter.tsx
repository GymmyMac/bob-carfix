import bobCounter from "@/assets/bob-counter.png";

interface MobileBobCharacterProps {
  currentImage: string;
  animationState: string;
  counterOverlayUrl?: string;
  counterHeightPercent?: number;
  scale?: number;
}

export const MobileBobCharacter = ({
  currentImage,
  animationState,
  counterOverlayUrl = bobCounter,
  counterHeightPercent = 15,
  scale = 100
}: MobileBobCharacterProps) => {
  // Calculate scaled dimensions
  const scaledWidth = (85 * scale) / 100;
  const scaledMaxWidth = (400 * scale) / 100;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Bob Character - positioned above counter */}
      <div 
        className="absolute left-0 z-10"
        style={{
          bottom: `${counterHeightPercent}%`,
          transform: 'translateX(-20%)',
          width: `${scaledWidth}%`,
          maxWidth: `${scaledMaxWidth}px`,
        }}
      >
        <img 
          src={currentImage} 
          alt={`Bob ${animationState}`} 
          className="w-full h-auto object-contain"
          style={{
            display: 'block'
          }}
        />
      </div>

      {/* Counter Overlay - acts as spacer/stage */}
      {counterOverlayUrl && (
        <div 
          className="absolute bottom-0 left-0 right-0 z-20"
          style={{
            height: `${counterHeightPercent}%`,
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
