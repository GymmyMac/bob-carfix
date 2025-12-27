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
        // Position Bob further off-screen to the left for tighter framing
        transform: 'translateX(-20%)',
        width: '85%',
        maxWidth: '400px',
        height: 'auto',
        minHeight: '50vh'
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
