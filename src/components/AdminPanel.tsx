import { AnimationState } from "@/hooks/useBobAnimation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, RotateCcw, Settings, Activity, MessageSquare, Zap, Timer, Eye, Image } from "lucide-react";
import { useState, useEffect } from "react";
import { ImageUploaderWithState } from "@/components/ImageUploaderWithState";
import { StateAssignmentCard } from "@/components/StateAssignmentCard";
import { AnimationPreview } from "@/components/AnimationPreview";
import { useBobAnimationConfig, AnimationState as AnimationStateType } from "@/hooks/useBobAnimationConfig";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel = ({ isOpen, onClose }: AdminPanelProps) => {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [talkSpeed, setTalkSpeed] = useState(400);
  const [messageCount, setMessageCount] = useState(0);
  const [systemStatus, setSystemStatus] = useState<"online" | "offline">("online");
  const [galleryTab, setGalleryTab] = useState("upload");
  
  // Bob Animation Config (for Gallery tab)
  const {
    configs,
    states,
    loading: galleryLoading,
    uploadImageWithState,
    updateAnimation,
    deleteAnimation,
    deleteState,
  } = useBobAnimationConfig();
  
  // Access the animation controls from the parent via window object (set in Index.tsx)
  const animationControls = (window as any).bobAnimationControls;
  const chatControls = (window as any).bobChatControls;
  
  // Early return AFTER all hooks are called
  if (!animationControls) {
    return null;
  }

  const { 
    animationState, 
    setAnimationState, 
    manualMode, 
    setManualMode,
    getCurrentImage,
    setTalkSpeed: setGlobalTalkSpeed
  } = animationControls;

  // Update message count when chat changes
  useEffect(() => {
    if (chatControls?.messages) {
      setMessageCount(chatControls.messages.length);
    }
  }, [chatControls?.messages]);

  // Update talk speed
  useEffect(() => {
    if (setGlobalTalkSpeed) {
      setGlobalTalkSpeed(talkSpeed);
    }
  }, [talkSpeed, setGlobalTalkSpeed]);

  const handleStateChange = (state: AnimationState) => {
    setAnimationState(state);
  };

  const handleClearChat = () => {
    if (chatControls?.clearMessages) {
      chatControls.clearMessages();
      setMessageCount(0);
    }
  };

  const handleResetToAuto = () => {
    setManualMode(false);
    setAnimationState("idle");
  };

  const getAssignmentsByState = (state: AnimationStateType) => {
    return configs
      .filter((c) => c.animation_state === state)
      .sort((a, b) => a.sequence_order - b.sequence_order);
  };

  const handleReorder = async (id: string, newOrder: number) => {
    const config = configs.find((c) => c.id === id);
    if (!config) return;

    const sameStateConfigs = configs.filter(
      (c) => c.animation_state === config.animation_state
    );

    const updates = sameStateConfigs.map(async (c) => {
      if (c.id === id) {
        return updateAnimation(id, { sequence_order: newOrder });
      } else if (
        c.sequence_order === newOrder &&
        newOrder < config.sequence_order
      ) {
        return updateAnimation(c.id, { sequence_order: c.sequence_order + 1 });
      } else if (
        c.sequence_order === newOrder &&
        newOrder > config.sequence_order
      ) {
        return updateAnimation(c.id, { sequence_order: c.sequence_order - 1 });
      }
    });

    await Promise.all(updates.filter(Boolean));
  };

  // Dynamic state buttons loaded from database
  const stateButtons = states
    .filter((s) => s.is_active)
    .sort((a, b) => a.display_order - b.display_order)
    .map((s) => ({
      state: s.state_key,
      label: s.title,
      description: s.description || "No description",
      speed: s.animation_speed || 400,
      pauseDuration: s.pause_duration || 0,
      loopCount: s.loop_count || 0,
      chatTrigger: s.chat_trigger || null
    }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Settings className="w-6 h-6" />
            Bob Admin Control Panel
            <Badge variant={manualMode ? "destructive" : "secondary"} className="text-sm">
              {manualMode ? "Manual" : "Auto"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Full control over Bob's behavior, animations, and system monitoring
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="controls" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="controls" className="gap-2">
              <Zap className="w-4 h-4" />
              Controls
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="monitor" className="gap-2">
              <Activity className="w-4 h-4" />
              Monitor
            </TabsTrigger>
            <TabsTrigger value="gallery" className="gap-2">
              <Image className="w-4 h-4" />
              Gallery
            </TabsTrigger>
          </TabsList>

          {/* CONTROLS TAB */}
          <TabsContent value="controls" className="space-y-6 mt-6">
            {/* Current State Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Current State
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 flex-shrink-0 border rounded-lg overflow-hidden bg-muted/50">
                    <img
                      src={getCurrentImage()}
                      alt="Bob current state"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Animation State</p>
                    <p className="text-3xl font-bold capitalize mb-2">{animationState}</p>
                    <Badge variant={systemStatus === "online" ? "default" : "destructive"}>
                      System {systemStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auto Mode Toggle */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-mode" className="text-lg font-semibold">
                      Automatic Mode
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {manualMode 
                        ? "Bob is under manual control - animations won't respond to chat" 
                        : "Bob responds automatically to chat interactions"}
                    </p>
                  </div>
                  <Switch
                    id="auto-mode"
                    checked={!manualMode}
                    onCheckedChange={(checked) => setManualMode(!checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* State Control Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>Manual Animation Control</CardTitle>
                <CardDescription>
                  {manualMode ? "Click any state to change Bob's animation" : "Enable manual mode to control animations"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {stateButtons.map(({ state, label, description }) => (
                    <Button
                      key={state}
                      variant={animationState === state ? "default" : "outline"}
                      className="h-auto flex-col items-start p-4 text-left"
                      onClick={() => handleStateChange(state)}
                      disabled={!manualMode}
                    >
                      <span className="font-semibold text-base">{label}</span>
                      <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {description}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-3">
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="w-5 h-5" />
                  Talk Speed Control
                </CardTitle>
                <CardDescription>
                  Adjust how fast Bob's mouth moves when speaking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <Label>Talk Speed: {talkSpeed}ms</Label>
                    <span className="text-sm text-muted-foreground">
                      {talkSpeed < 300 ? "Fast" : talkSpeed > 500 ? "Slow" : "Normal"}
                    </span>
                  </div>
                  <Slider
                    value={[talkSpeed]}
                    onValueChange={(values) => setTalkSpeed(values[0])}
                    min={100}
                    max={800}
                    step={50}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Fast (100ms)</span>
                    <span>Slow (800ms)</span>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Preview Changes</p>
                    <p className="text-sm text-muted-foreground">Set to talking state to test speed</p>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setManualMode(true);
                      setAnimationState("talking");
                    }}
                  >
                    Test Talk Speed
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Animation Settings</CardTitle>
                <CardDescription>Future animation customization options</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Additional animation controls and customization options coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MONITOR TAB */}
          <TabsContent value="monitor" className="space-y-6 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Messages
                  </CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{messageCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Messages in current conversation
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    System Status
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold capitalize">{systemStatus}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All systems operational
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Current Mode
                  </CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{manualMode ? "Manual" : "Auto"}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {manualMode ? "Under manual control" : "Automatic responses"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Talk Speed
                  </CardTitle>
                  <Timer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{talkSpeed}ms</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mouth animation interval
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Animation State Log</CardTitle>
                <CardDescription>Current Bob animation state details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span className="text-muted-foreground">State:</span>
                    <span className="font-semibold">{animationState}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="font-semibold">{manualMode ? "Manual" : "Automatic"}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-muted rounded">
                    <span className="text-muted-foreground">Image:</span>
                    <span className="font-semibold text-xs truncate max-w-[200px]">
                      {getCurrentImage().split('/').pop()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GALLERY TAB */}
          <TabsContent value="gallery" className="space-y-6 mt-6">
            {galleryLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading gallery...</p>
              </div>
            ) : (
              <Tabs value={galleryTab} onValueChange={setGalleryTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upload">Upload & Define</TabsTrigger>
                  <TabsTrigger value="assign">Assign to States</TabsTrigger>
                  <TabsTrigger value="preview">Live Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-6 mt-4">
                  <ImageUploaderWithState
                    onUpload={uploadImageWithState}
                    onUploadComplete={(url) => console.log("Uploaded:", url)}
                  />
                </TabsContent>

                <TabsContent value="assign" className="space-y-6 mt-4">
                  {states
                    .filter((s) => s.is_active)
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((state) => (
                      <StateAssignmentCard
                        key={state.id}
                        stateId={state.id}
                        state={state.state_key}
                        title={state.title}
                        description={state.description || ""}
                        assignments={getAssignmentsByState(state.state_key)}
                        onDelete={deleteAnimation}
                        onDeleteState={deleteState}
                        onToggleActive={(id, isActive) =>
                          updateAnimation(id, { is_active: isActive })
                        }
                        onReorder={handleReorder}
                      />
                    ))}
                </TabsContent>

                <TabsContent value="preview" className="space-y-6 mt-4">
                  <AnimationPreview />
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
