import { AnimationState } from "@/hooks/useBobAnimation";
interface BobCharacterProps {
  currentImage: string;
  animationState: AnimationState;
  className?: string;
}
export const BobCharacter = ({
  currentImage,
  animationState,
  className = ""
}: BobCharacterProps) => {
  // Determine animation classes based on state
  const getAnimationClass = () => {
    // All animations disabled
    return "";
  };
  return <div className={`flex flex-col items-center justify-center gap-6 ${className}`}>
      <div className="relative w-full max-w-md aspect-square">
        <img src={currentImage} alt={`Bob ${animationState}`} className={`w-full h-full object-contain transition-all duration-300 ${getAnimationClass()}`} />
      </div>
      
    </div>;
};