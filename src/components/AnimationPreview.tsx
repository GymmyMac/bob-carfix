import { BobCharacter } from "./BobCharacter";
import { Button } from "@/components/ui/button";
import { useBobAnimation } from "@/hooks/useBobAnimation";
import { useBobAnimationConfig } from "@/hooks/useBobAnimationConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const AnimationPreview = () => {
  const { animationState, setAnimationState, getCurrentImage, setTalkSpeed } = useBobAnimation();
  const { states, getTalkingState } = useBobAnimationConfig();
  
  const talkingStateKey = getTalkingState();

  const stateButtons = states
    .filter((s) => s.is_active)
    .sort((a, b) => a.display_order - b.display_order)
    .map((s) => ({ state: s.state_key, label: s.title }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Preview</CardTitle>
        <CardDescription>
          Test how Bob looks with your defined states
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
              onClick={() => {
                setAnimationState(state);
                // Match front-end chat timing for talking state
                if (state === talkingStateKey) {
                  setTalkSpeed(200);
                }
              }}
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
