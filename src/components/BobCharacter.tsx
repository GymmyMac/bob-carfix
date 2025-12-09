import { AnimationState } from "@/hooks/useBobAnimation";
interface BobCharacterProps {
  currentImage: string;
  animationState: AnimationState;
  backdropUrl?: string;
  className?: string;
  verticalOffset?: number;
}
export const BobCharacter = ({
  currentImage,
  animationState,
  backdropUrl,
  className = "",
  verticalOffset = 0
}: BobCharacterProps) => {
  // Determine animation classes based on state
  const getAnimationClass = () => {
    // All animations disabled
    return "";
  };
  return (
    <div className={`flex flex-col items-center justify-center gap-6 w-full ${className}`}>
      <div className="relative w-full max-w-[600px] mx-auto aspect-[16/10] flex items-end justify-center overflow-hidden">
        {/* Backdrop Layer - behind Bob */}
        {backdropUrl && (
          <img 
            src={backdropUrl} 
            alt="Backdrop" 
            className="absolute inset-0 z-0 w-full h-full object-cover object-bottom"
          />
        )}
        
        {/* Bob Layer - scales proportionally with container */}
        <img 
          src={currentImage} 
          alt={`Bob ${animationState}`} 
          className={`relative z-10 w-[55%] max-w-[220px] h-auto object-contain ${getAnimationClass()}`}
          style={{ marginBottom: `${verticalOffset}%` }}
        />
      </div>
    </div>
  );
};