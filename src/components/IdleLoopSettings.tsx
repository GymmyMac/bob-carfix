import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useBobAnimationConfig } from "@/hooks/useBobAnimationConfig";
import { useToast } from "@/hooks/use-toast";

export const IdleLoopSettings = () => {
  const { getIdleTimeoutSettings, updateIdleTimeout } = useBobAnimationConfig();
  const { toast } = useToast();
  
  const settings = getIdleTimeoutSettings();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [timeoutSeconds, setTimeoutSeconds] = useState(Math.round(settings.timeoutMs / 1000));

  useEffect(() => {
    const settings = getIdleTimeoutSettings();
    setEnabled(settings.enabled);
    setTimeoutSeconds(Math.round(settings.timeoutMs / 1000));
  }, [getIdleTimeoutSettings]);

  const handleToggle = async (checked: boolean) => {
    try {
      setEnabled(checked);
      if (checked) {
        // Enable with current timeout value
        await updateIdleTimeout(timeoutSeconds * 1000);
        toast({
          title: "Idle Loop Enabled",
          description: `Bob will wave every ${timeoutSeconds} seconds when idle`,
        });
      } else {
        // Disable by setting to null
        await updateIdleTimeout(null);
        toast({
          title: "Idle Loop Disabled",
          description: "Bob will stay in idle state without looping",
        });
      }
    } catch (error) {
      console.error("Error updating idle loop:", error);
      toast({
        title: "Error",
        description: "Failed to update idle loop settings",
        variant: "destructive",
      });
      setEnabled(!checked);
    }
  };

  const handleTimeoutChange = async (values: number[]) => {
    const newTimeout = values[0];
    setTimeoutSeconds(newTimeout);
    
    // Only update if enabled
    if (enabled) {
      try {
        await updateIdleTimeout(newTimeout * 1000);
      } catch (error) {
        console.error("Error updating timeout:", error);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="idle-loop-enabled" className="text-base font-semibold">
            Enable Idle Loop
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Bob will wave to get attention when idle
          </p>
        </div>
        <Switch
          id="idle-loop-enabled"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </div>

      <Separator />

      <div className={enabled ? "" : "opacity-50 pointer-events-none"}>
        <div className="flex justify-between mb-2">
          <Label>Timeout Duration: {timeoutSeconds} seconds</Label>
          <span className="text-sm text-muted-foreground">
            {timeoutSeconds < 15 ? "Very Fast" : timeoutSeconds < 30 ? "Fast" : timeoutSeconds < 60 ? "Normal" : "Slow"}
          </span>
        </div>
        <Slider
          value={[timeoutSeconds]}
          onValueChange={handleTimeoutChange}
          min={5}
          max={120}
          step={5}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>5 seconds</span>
          <span>120 seconds</span>
        </div>
      </div>

      <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded">
        <p className="font-medium mb-1">How it works:</p>
        <p>
          When enabled, Bob will automatically return to his welcome/wave state
          after being idle for the specified duration. After waving, he'll return
          to the idle state and the loop continues.
        </p>
      </div>
    </div>
  );
};
