import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { AnimationState } from "@/hooks/useBobAnimation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, RotateCcw, Settings, Activity, MessageSquare, Zap, Timer, Eye, Image, Database, Volume2, Wand2, ArrowLeft, FileText, Palette } from "lucide-react";
import { PromptsManager } from "@/components/PromptsManager";
import { ImageUploaderWithState } from "@/components/ImageUploaderWithState";
import { StateAssignmentCard } from "@/components/StateAssignmentCard";
import { AnimationPreview } from "@/components/AnimationPreview";
import { CSVChunkUploader } from "@/components/CSVChunkUploader";
import { IdleLoopSettings } from "@/components/IdleLoopSettings";
import { BackdropManager } from "@/components/BackdropManager";
import { VoiceSettings } from "@/components/VoiceSettings";
import { LooksManager } from "@/components/LooksManager";
import { AIAnimationBuilder } from "@/components/AIAnimationBuilder";
import { BobCharacter } from "@/components/BobCharacter";
import { ThemeSettingsPanel } from "@/components/ThemeSettingsPanel";
import { SparkDealsSettings } from "@/components/SparkDealsSettings";
import { useBobAnimationConfig, AnimationState as AnimationStateType } from "@/hooks/useBobAnimationConfig";
import { useBobAnimation } from "@/hooks/useBobAnimation";
import { useBobBackdrop } from "@/hooks/useBobBackdrop";
import bobBgWall from "@/assets/bob-bg-wall.png";
import bobCounter from "@/assets/bob-counter.png";

const Admin = () => {
  const [talkSpeed, setTalkSpeed] = useState(400);
  const [messageCount, setMessageCount] = useState(0);
  const [systemStatus, setSystemStatus] = useState<"online" | "offline">("online");
  const [galleryTab, setGalleryTab] = useState("upload");
  const [selectedLookId, setSelectedLookId] = useState<string | null>(null);

  // Animation controls
  const {
    animationState,
    setAnimationState,
    getCurrentImage,
    getCurrentOffset,
    getCurrentScale,
    manualMode,
    setManualMode,
    setTalkSpeed: setGlobalTalkSpeed
  } = useBobAnimation();

  // Backdrop
  const { activeBackdrop } = useBobBackdrop();

  // Bob Animation Config (for Gallery tab) - filtered by selected look
  const {
    configs,
    states,
    looks,
    activeLookId,
    loading: galleryLoading,
    uploadImageWithState,
    updateAnimation,
    deleteAnimation,
    deleteState,
    updateStateSettings,
    batchReorder,
    refetch,
  } = useBobAnimationConfig(selectedLookId);

  // Initialize selectedLookId when looks load
  useEffect(() => {
    if (looks.length > 0 && !selectedLookId) {
      const activeLook = looks.find((l) => l.is_active);
      setSelectedLookId(activeLook?.id || looks[0]?.id || null);
    }
  }, [looks, selectedLookId]);

  // Update talk speed globally
  useEffect(() => {
    if (setGlobalTalkSpeed) {
      setGlobalTalkSpeed(talkSpeed);
    }
  }, [talkSpeed, setGlobalTalkSpeed]);

  // Memoized callbacks
  const handleStateChange = useCallback((state: AnimationState) => {
    setAnimationState(state);
  }, [setAnimationState]);

  const handleResetToAuto = useCallback(() => {
    setManualMode(false);
    setAnimationState("idle");
  }, [setManualMode, setAnimationState]);

  // Memoized getAssignmentsByState function
  const getAssignmentsByState = useCallback((state: AnimationStateType) => {
    return configs
      .filter((c) => c.animation_state === state)
      .sort((a, b) => a.sequence_order - b.sequence_order);
  }, [configs]);

  // Memoized batch reorder handler
  const handleBatchReorder = useCallback(async (items: Array<{ id: string; sequence_order: number }>) => {
    await batchReorder(items);
  }, [batchReorder]);

  // Memoized state buttons
  const stateButtons = useMemo(() => {
    return states
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
  }, [states]);

  // Memoized sorted states for gallery
  const sortedActiveStates = useMemo(() => {
    return states
      .filter((s) => s.is_active)
      .sort((a, b) => a.display_order - b.display_order);
  }, [states]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Bob
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <Settings className="w-6 h-6" />
              <h1 className="text-xl font-bold">Bob Admin Control Panel</h1>
              <Badge variant={manualMode ? "destructive" : "secondary"}>
                {manualMode ? "Manual" : "Auto"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Bob Preview (Left Sidebar) */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Live Preview</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="aspect-square w-full max-w-[200px] mx-auto">
                  <BobCharacter
                    currentImage={getCurrentImage()}
                    animationState={animationState}
                    backdropUrl={bobBgWall}
                    counterOverlayUrl={bobCounter}
                    counterHeightPercent={activeBackdrop?.counter_height_percent ?? 12}
                    verticalOffset={getCurrentOffset()}
                    scale={getCurrentScale()}
                  />
                </div>
                <div className="text-center mt-2">
                  <Badge variant="outline" className="text-xs">
                    {animationState}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Tabs (Main Area) */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="controls" className="w-full">
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="controls" className="gap-1 text-xs">
                  <Zap className="w-3 h-3" />
                  Controls
                </TabsTrigger>
                <TabsTrigger value="prompts" className="gap-1 text-xs">
                  <FileText className="w-3 h-3" />
                  Prompts
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-1 text-xs">
                  <Settings className="w-3 h-3" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="theme" className="gap-1 text-xs">
                  <Palette className="w-3 h-3" />
                  Theme
                </TabsTrigger>
                <TabsTrigger value="gallery" className="gap-1 text-xs">
                  <Image className="w-3 h-3" />
                  Gallery
                </TabsTrigger>
                <TabsTrigger value="backdrop" className="gap-1 text-xs">
                  <Image className="w-3 h-3" />
                  Backdrop
                </TabsTrigger>
                <TabsTrigger value="monitor" className="gap-1 text-xs">
                  <Activity className="w-3 h-3" />
                  Monitor
                </TabsTrigger>
                <TabsTrigger value="data" className="gap-1 text-xs">
                  <Database className="w-3 h-3" />
                  Data
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

                {/* State Management */}
                <Card>
                  <CardHeader>
                    <CardTitle>State Management</CardTitle>
                    <CardDescription>
                      Quick state triggers and configuration overview
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Quick State Triggers */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Quick State Triggers</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {stateButtons.map(({ state, label, chatTrigger }) => (
                          <Button
                            key={state}
                            variant={animationState === state ? "default" : "outline"}
                            size="sm"
                            className="justify-start gap-2"
                            onClick={() => handleStateChange(state)}
                            disabled={!manualMode}
                          >
                            <span className="font-medium">{label}</span>
                            {chatTrigger && (
                              <Badge variant="secondary" className="text-xs px-1">
                                {chatTrigger.split("_")[0]}
                              </Badge>
                            )}
                          </Button>
                        ))}
                      </div>
                      {!manualMode && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Enable manual mode above to test state triggers
                        </p>
                      )}
                    </div>

                    <Separator />

                    {/* Configuration Summary */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Configuration Summary</Label>
                      <div className="space-y-2">
                        {stateButtons.map(({ state, label, speed, pauseDuration, loopCount, chatTrigger }) => (
                          <div key={state} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                            <span className="font-medium">{label}</span>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{speed}ms</span>
                              <span>Pause: {pauseDuration}ms</span>
                              <span>Loops: {loopCount === 0 ? "∞" : loopCount}</span>
                              {chatTrigger && (
                                <Badge variant="outline" className="text-xs">
                                  {chatTrigger.replace("_", " ")}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        For detailed configuration, see Gallery → Assign to States
                      </p>
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
                      onClick={handleResetToAuto}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset to Auto
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PROMPTS TAB */}
              <TabsContent value="prompts" className="space-y-6 mt-6">
                <PromptsManager />
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
                    <CardTitle className="flex items-center gap-2">
                      <RotateCcw className="w-5 h-5" />
                      Idle Loop Settings
                    </CardTitle>
                    <CardDescription>
                      Configure Bob to wave periodically when idle
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <IdleLoopSettings />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Volume2 className="w-5 h-5" />
                      Bob's Voice
                    </CardTitle>
                    <CardDescription>
                      Choose Bob's text-to-speech voice accent and style
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VoiceSettings />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* THEME TAB - NEW */}
              <TabsContent value="theme" className="space-y-6 mt-6">
                <ThemeSettingsPanel />
                <SparkDealsSettings />
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
                {/* Looks Manager */}
                <LooksManager
                  looks={looks}
                  selectedLookId={selectedLookId}
                  onSelectLook={setSelectedLookId}
                  onRefresh={refetch}
                />

                {galleryLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Loading gallery...</p>
                  </div>
                ) : (
                  <Tabs value={galleryTab} onValueChange={setGalleryTab}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="ai-builder" className="gap-1">
                        <Wand2 className="w-3 h-3" />
                        AI Builder
                      </TabsTrigger>
                      <TabsTrigger value="upload">Upload & Define</TabsTrigger>
                      <TabsTrigger value="assign">Assign to States</TabsTrigger>
                      <TabsTrigger value="preview">Live Preview</TabsTrigger>
                    </TabsList>

                    <TabsContent value="ai-builder" className="space-y-6 mt-4">
                      <AIAnimationBuilder
                        lookId={selectedLookId}
                        onComplete={() => setGalleryTab("assign")}
                      />
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-6 mt-4">
                      <ImageUploaderWithState
                        onUpload={(file, stateData) => uploadImageWithState(file, stateData, selectedLookId)}
                        onUploadComplete={(url) => console.log("Uploaded:", url)}
                        lookId={selectedLookId}
                      />
                    </TabsContent>

                    <TabsContent value="assign" className="space-y-6 mt-4">
                      {states.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No states found for this look. Upload images to create states.
                        </div>
                      ) : (
                        sortedActiveStates.map((state) => (
                          <StateAssignmentCard
                            key={state.id}
                            stateId={state.id}
                            state={state.state_key}
                            title={state.title}
                            description={state.description || ""}
                            animationSpeed={state.animation_speed || 400}
                            pauseDuration={state.pause_duration || 0}
                            loopCount={state.loop_count || 0}
                            chatTrigger={state.chat_trigger || null}
                            assignments={getAssignmentsByState(state.state_key)}
                            onDelete={deleteAnimation}
                            onDeleteState={deleteState}
                            onToggleActive={(id, isActive) =>
                              updateAnimation(id, { is_active: isActive })
                            }
                            onBatchReorder={handleBatchReorder}
                            onUpdateSettings={updateStateSettings}
                            onUpdateOffset={(id, offset) =>
                              updateAnimation(id, { vertical_offset: offset })
                            }
                            onUpdateScale={(id, scale) =>
                              updateAnimation(id, { scale: scale })
                            }
                          />
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="preview" className="space-y-6 mt-4">
                      <AnimationPreview />
                    </TabsContent>
                  </Tabs>
                )}
              </TabsContent>

              {/* DATA TAB */}
              <TabsContent value="data" className="space-y-6 mt-6">
                <CSVChunkUploader />
              </TabsContent>

              {/* BACKDROP TAB */}
              <TabsContent value="backdrop" className="space-y-6 mt-6">
                <BackdropManager />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
