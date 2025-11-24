import { AnimationState } from "@/hooks/useBobAnimation";

interface BobCharacterProps {
  currentImage: string;
  animationState: AnimationState;
  className?: string;
}

export const BobCharacter = ({ currentImage, animationState, className = "" }: BobCharacterProps) => {
  // Determine animation classes based on state
  const getAnimationClass = () => {
    switch (animationState) {
      case "idle":
        return "animate-[bob-float_3s_ease-in-out_infinite,bob-breathe_4s_ease-in-out_infinite]";
      case "happy":
        return "animate-[bob-happy-bounce_0.6s_ease-in-out]";
      case "grump":
        return "animate-[bob-grump-shake_0.5s_ease-in-out]";
      case "talking":
        return "animate-[bob-talk-pulse_0.4s_ease-in-out_infinite]";
      default:
        return "";
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-6 ${className}`}>
      <div className="relative w-full max-w-md aspect-square">
        <img
          src={currentImage}
          alt={`Bob ${animationState}`}
          className={`w-full h-full object-contain transition-all duration-300 ${getAnimationClass()}`}
        />
      </div>
      <div className="text-center max-w-md px-4">
        <p className="text-xl md:text-2xl font-medium text-foreground">
          G'day! Bob from CARFIX here.
        </p>
        <p className="text-lg text-muted-foreground mt-2">
          How can I help ya today?
        </p>
      </div>
    </div>
  );
};
