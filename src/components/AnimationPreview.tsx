import { BobCharacter } from "./BobCharacter";
import { Button } from "@/components/ui/button";
import { AnimationState, useBobAnimation } from "@/hooks/useBobAnimation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const stateButtons: { state: AnimationState; label: string }[] = [
  { state: "idle", label: "Idle" },
  { state: "thinking", label: "Thinking" },
  { state: "talking", label: "Talking" },
  { state: "happy", label: "Happy" },
  { state: "complete", label: "Complete" },
];

export const AnimationPreview = () => {
  const { animationState, setAnimationState, getCurrentImage } = useBobAnimation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Preview</CardTitle>
        <CardDescription>
          Test how Bob looks with your assigned animations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted rounded-lg p-8">
          <BobCharacter
            currentImage={getCurrentImage()}
            animationState={animationState}
            className="max-w-md mx-auto"
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {stateButtons.map(({ state, label }) => (
            <Button
              key={state}
              variant={animationState === state ? "default" : "outline"}
              onClick={() => setAnimationState(state)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Current state: <span className="font-medium">{animationState}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
