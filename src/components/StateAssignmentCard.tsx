import { useState } from "react";
import { Trash2, ChevronUp, ChevronDown, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimationState, BobAnimationConfig } from "@/hooks/useBobAnimationConfig";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface StateAssignmentCardProps {
  stateId: string;
  state: AnimationState;
  title: string;
  description: string;
  animationSpeed: number;
  pauseDuration: number;
  loopCount: number;
  chatTrigger: string | null;
  assignments: BobAnimationConfig[];
  onDelete: (id: string) => Promise<void>;
  onDeleteState: (stateId: string) => Promise<void>;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
  onReorder: (id: string, newOrder: number) => Promise<void>;
  onUpdateSettings: (stateId: string, updates: {
    animation_speed?: number;
    pause_duration?: number;
    loop_count?: number;
    chat_trigger?: string | null;
  }) => Promise<void>;
  onUpdateOffset: (id: string, offset: number) => Promise<void>;
}

export const StateAssignmentCard = ({
  stateId,
  state,
  title,
  description,
  animationSpeed,
  pauseDuration,
  loopCount,
  chatTrigger,
  assignments,
  onDelete,
  onDeleteState,
  onToggleActive,
  onReorder,
  onUpdateSettings,
  onUpdateOffset,
}: StateAssignmentCardProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [deletingState, setDeletingState] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [localSpeed, setLocalSpeed] = useState(animationSpeed);
  const [localPause, setLocalPause] = useState(pauseDuration);
  const [localLoops, setLocalLoops] = useState(loopCount);
  const [localTrigger, setLocalTrigger] = useState<string | null>(chatTrigger);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingOffset, setEditingOffset] = useState<string | null>(null);
  const [localOffset, setLocalOffset] = useState(0);
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    setLoading(id);
    try {
      await onDelete(id);
      toast({ title: "Image removed" });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setLoading(id);
    try {
      await onToggleActive(id, !currentActive);
      toast({
        title: currentActive ? "Image deactivated" : "Image activated",
      });
    } catch (error) {
      console.error("Toggle error:", error);
      toast({
        title: "Failed to update",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const currentIndex = assignments.findIndex((a) => a.id === id);
    if (currentIndex === -1) return;

    const newOrder =
      direction === "up"
        ? assignments[currentIndex].sequence_order - 1
        : assignments[currentIndex].sequence_order + 1;

    if (newOrder < 1 || newOrder > assignments.length) return;

    setLoading(id);
    try {
      await onReorder(id, newOrder);
    } catch (error) {
      console.error("Reorder error:", error);
      toast({
        title: "Failed to reorder",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteState = async () => {
    setDeletingState(true);
    try {
      await onDeleteState(stateId);
      toast({ title: "State deleted successfully" });
    } catch (error) {
      console.error("Delete state error:", error);
      toast({
        title: "Failed to delete state",
        variant: "destructive",
      });
    } finally {
      setDeletingState(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await onUpdateSettings(stateId, {
        animation_speed: localSpeed,
        pause_duration: localPause,
        loop_count: localLoops,
        chat_trigger: localTrigger,
      });
      toast({ title: "State settings saved" });
    } catch (error) {
      console.error("Save settings error:", error);
      toast({
        title: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateOffset = async (id: string) => {
    try {
      await onUpdateOffset(id, localOffset);
      setEditingOffset(null);
      toast({ title: "Vertical offset updated" });
    } catch (error) {
      console.error("Update offset error:", error);
      toast({
        title: "Failed to update offset",
        variant: "destructive",
      });
    }
  };

  const getChatTriggerLabel = (trigger: string | null) => {
    if (!trigger) return "(none) - Manual only";
    const labels: Record<string, string> = {
      page_load: "🎬 Page Load - Initial greeting",
      awaiting_input: "⏸️ Awaiting Input - Waiting for user",
      processing_input: "🔍 Processing Input - Thinking",
      streaming_response: "💬 Streaming Response - Talking",
      response_complete: "✅ Response Complete - Finished",
    };
    return labels[trigger] || trigger;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle>{title}</CardTitle>
              {chatTrigger && (
                <Badge variant="secondary" className="text-xs">
                  {getChatTriggerLabel(chatTrigger).split(" - ")[0]}
                </Badge>
              )}
            </div>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteState}
            disabled={deletingState}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete State
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* State Configuration Section */}
        <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                State Configuration
              </span>
              <span className="text-xs text-muted-foreground">
                {configOpen ? "Hide" : "Show"}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4 p-4 border rounded-lg bg-muted/30">
            {/* Animation Speed Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`speed-${stateId}`}>Animation Speed</Label>
                <span className="text-sm font-medium">{localSpeed}ms</span>
              </div>
              <Slider
                id={`speed-${stateId}`}
                value={[localSpeed]}
                onValueChange={(values) => setLocalSpeed(values[0])}
                min={50}
                max={800}
                step={50}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Fast (50ms)</span>
                <span>Normal (400ms)</span>
                <span>Slow (800ms)</span>
              </div>
            </div>

            {/* Pause Duration Input */}
            <div className="space-y-2">
              <Label htmlFor={`pause-${stateId}`}>Pause Duration (ms)</Label>
              <Input
                id={`pause-${stateId}`}
                type="number"
                value={localPause}
                onChange={(e) => setLocalPause(Math.max(0, Math.min(5000, parseInt(e.target.value) || 0)))}
                min={0}
                max={5000}
                step={100}
              />
              <p className="text-xs text-muted-foreground">
                Delay after completing loops (0-5000ms)
              </p>
            </div>

            {/* Loop Count Input */}
            <div className="space-y-2">
              <Label htmlFor={`loops-${stateId}`}>Loop Count</Label>
              <Input
                id={`loops-${stateId}`}
                type="number"
                value={localLoops}
                onChange={(e) => setLocalLoops(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                min={0}
                max={10}
              />
              <p className="text-xs text-muted-foreground">
                0 = infinite loops, 1-10 = specific count
              </p>
            </div>

            {/* Chat Trigger Select */}
            <div className="space-y-2">
              <Label htmlFor={`trigger-${stateId}`}>Chat Trigger</Label>
              <Select value={localTrigger || "none"} onValueChange={(v) => setLocalTrigger(v === "none" ? null : v)}>
                <SelectTrigger id={`trigger-${stateId}`}>
                  <SelectValue placeholder="Select chat trigger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">(none) - Manual only</SelectItem>
                  <SelectItem value="page_load">🎬 Page Load - Initial greeting</SelectItem>
                  <SelectItem value="awaiting_input">⏸️ Awaiting Input - Waiting for user</SelectItem>
                  <SelectItem value="processing_input">🔍 Processing Input - Thinking</SelectItem>
                  <SelectItem value="streaming_response">💬 Streaming Response - Talking</SelectItem>
                  <SelectItem value="response_complete">✅ Response Complete - Finished</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                When this state should auto-activate during conversation
              </p>
            </div>

            {/* Save Button */}
            <Button 
              onClick={handleSaveSettings} 
              disabled={savingSettings}
              className="w-full"
            >
              {savingSettings ? "Saving..." : "Save Settings"}
            </Button>
          </CollapsibleContent>
        </Collapsible>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No images assigned to this state
          </p>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment, index) => (
              <div
                key={assignment.id}
                className={`space-y-3 p-4 border rounded-lg transition-opacity ${
                  !assignment.is_active ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0">
                    <img
                      src={assignment.image_url}
                      alt={`${state} ${assignment.sequence_order}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Sequence {assignment.sequence_order}
                    </p>
                    {assignment.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {assignment.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {assignment.is_active ? "Active" : "Inactive"} • Offset: {assignment.vertical_offset}px
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {assignments.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReorder(assignment.id, "up")}
                          disabled={index === 0 || loading === assignment.id}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReorder(assignment.id, "down")}
                          disabled={
                            index === assignments.length - 1 ||
                            loading === assignment.id
                          }
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleToggleActive(assignment.id, assignment.is_active)
                      }
                      disabled={loading === assignment.id}
                    >
                      <span className="text-xs">
                        {assignment.is_active ? "Hide" : "Show"}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(assignment.id)}
                      disabled={loading === assignment.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Vertical Offset Control */}
                {editingOffset === assignment.id ? (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Vertical Offset (px)</Label>
                      <span className="text-xs font-medium">{localOffset}px</span>
                    </div>
                    <Slider
                      value={[localOffset]}
                      onValueChange={(values) => setLocalOffset(values[0])}
                      min={-50}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleUpdateOffset(assignment.id)}
                        className="flex-1"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingOffset(null)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingOffset(assignment.id);
                      setLocalOffset(assignment.vertical_offset);
                    }}
                    className="w-full text-xs"
                  >
                    Adjust Vertical Position
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
