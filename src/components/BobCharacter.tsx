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
  return <div className={`flex flex-col items-center justify-center gap-6 w-full ${className}`}>
      <div className="relative w-full h-[400px] flex items-end justify-center">
        {/* Backdrop Layer - behind Bob */}
        {backdropUrl && (
          <img 
            src={backdropUrl} 
            alt="Backdrop" 
            className="absolute inset-0 z-0 w-full h-full object-cover object-bottom"
          />
        )}
        
        {/* Bob Layer - in front */}
        <img 
          src={currentImage} 
          alt={`Bob ${animationState}`} 
          className={`relative z-10 w-[320px] h-[400px] object-contain ${getAnimationClass()}`}
          style={{ marginBottom: `${verticalOffset}px` }}
        />
      </div>
      
    </div>;
};