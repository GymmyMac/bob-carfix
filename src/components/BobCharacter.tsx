import { AnimationState } from "@/hooks/useBobAnimation";

interface BobCharacterProps {
  currentImage: string;
  animationState: AnimationState;
  className?: string;
}

export const BobCharacter = ({ currentImage, animationState, className = "" }: BobCharacterProps) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-6 ${className}`}>
      <div className="relative w-full max-w-md aspect-square">
        <img
          src={currentImage}
          alt={`Bob ${animationState}`}
          className="w-full h-full object-contain transition-opacity duration-200"
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
