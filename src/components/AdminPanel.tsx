import { AnimationState } from "@/hooks/useBobAnimation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, RotateCcw } from "lucide-react";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel = ({ isOpen, onClose }: AdminPanelProps) => {
  // Access the animation controls from the parent via window object (set in Index.tsx)
  const animationControls = (window as any).bobAnimationControls;
  
  if (!animationControls) {
    return null;
  }

  const { 
    animationState, 
    setAnimationState, 
    manualMode, 
    setManualMode,
    getCurrentImage 
  } = animationControls;

  const handleStateChange = (state: AnimationState) => {
    setAnimationState(state);
  };

  const handleClearChat = () => {
    const chatControls = (window as any).bobChatControls;
    if (chatControls?.clearMessages) {
      chatControls.clearMessages();
    }
  };

  const handleResetToAuto = () => {
    setManualMode(false);
    setAnimationState("idle");
  };

  const stateButtons: Array<{ state: AnimationState; label: string; description: string }> = [
    { state: "idle", label: "Idle", description: "Anything else I can help with?" },
    { state: "thinking", label: "Thinking", description: "Thinking or researching" },
    { state: "talking", label: "Talking", description: "Bob's talking" },
    { state: "happy", label: "Happy", description: "Welcome, thank you, completing a sale" },
    { state: "complete", label: "Complete", description: "Thank you, all done" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Bob Admin Control Panel
            <Badge variant={manualMode ? "destructive" : "secondary"}>
              {manualMode ? "Manual" : "Auto"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current State Display */}
          <div className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 flex-shrink-0">
                <img
                  src={getCurrentImage()}
                  alt="Bob current state"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current State</p>
                <p className="text-2xl font-semibold capitalize">{animationState}</p>
              </div>
            </div>
          </div>

          {/* Auto Mode Toggle */}
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div>
              <Label htmlFor="auto-mode" className="text-base font-medium">
                Auto Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                {manualMode 
                  ? "Bob is in manual control mode" 
                  : "Bob responds automatically to chat"}
              </p>
            </div>
            <Switch
              id="auto-mode"
              checked={!manualMode}
              onCheckedChange={(checked) => setManualMode(!checked)}
            />
          </div>

          {/* State Control Buttons */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Manual State Control</Label>
            <div className="grid grid-cols-2 gap-3">
              {stateButtons.map(({ state, label, description }) => (
                <Button
                  key={state}
                  variant={animationState === state ? "default" : "outline"}
                  className="h-auto flex-col items-start p-4 text-left"
                  onClick={() => handleStateChange(state)}
                  disabled={!manualMode}
                >
                  <span className="font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {description}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleClearChat}
            >
              <Trash2 className="w-4 h-4" />
              Clear Chat
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleResetToAuto}
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Auto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
