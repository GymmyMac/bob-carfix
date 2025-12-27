interface MobileBobCharacterProps {
  currentImage: string;
  animationState: string;
}

export const MobileBobCharacter = ({
  currentImage,
  animationState
}: MobileBobCharacterProps) => {
  return (
    <div 
      className="absolute bottom-0 left-0 z-10 pointer-events-none"
      style={{
        // Position Bob slightly off-screen to the left for tighter framing
        transform: 'translateX(-15%)',
        width: '75%',
        maxWidth: '320px',
        height: 'auto'
      }}
    >
      <img 
        src={currentImage} 
        alt={`Bob ${animationState}`} 
        className="w-full h-auto object-contain"
        style={{
          // Ensure Bob fills from bottom up
          display: 'block'
        }}
      />
    </div>
  );
};
