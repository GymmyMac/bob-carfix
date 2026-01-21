import React, { useState, useCallback, useRef, useEffect, memo } from "react";
import { Trash2, Settings2 } from "lucide-react";
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableImageItem } from "./SortableImageItem";
import { QuickImageUploader } from "./QuickImageUploader";

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
  lookId?: string | null;
  onDelete: (id: string) => Promise<void>;
  onDeleteState: (stateId: string) => Promise<void>;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
  onBatchReorder: (items: Array<{ id: string; sequence_order: number }>) => Promise<void>;
  onUpdateSettings: (stateId: string, updates: {
    animation_speed?: number;
    pause_duration?: number;
    loop_count?: number;
    chat_trigger?: string | null;
  }) => Promise<void>;
  onUpdateOffset: (id: string, offset: number) => Promise<void>;
  onUpdateScale: (id: string, scale: number) => Promise<void>;
  onApplyGlobalScale?: (scale: number) => Promise<void>;
  onRefresh?: () => void;
}

export const StateAssignmentCard = memo(({
  stateId,
  state,
  title,
  description,
  animationSpeed,
  pauseDuration,
  loopCount,
  chatTrigger,
  assignments,
  lookId,
  onDelete,
  onDeleteState,
  onToggleActive,
  onBatchReorder,
  onUpdateSettings,
  onUpdateOffset,
  onUpdateScale,
  onApplyGlobalScale,
  onRefresh,
}: StateAssignmentCardProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [deletingState, setDeletingState] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  
  const [localSpeed, setLocalSpeed] = useState(animationSpeed);
  const [localPause, setLocalPause] = useState(pauseDuration);
  const [localLoops, setLocalLoops] = useState(loopCount);
  const [localTrigger, setLocalTrigger] = useState<string | null>(chatTrigger);
  const [savingSettings, setSavingSettings] = useState(false);
  const { toast } = useToast();
  
  // Debounce ref for speed slider
  const speedDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (speedDebounceRef.current) {
        clearTimeout(speedDebounceRef.current);
      }
    };
  }, []);

  // Sync local state when props change (e.g., after refetch from realtime)
  useEffect(() => {
    setLocalSpeed(animationSpeed);
  }, [animationSpeed]);

  useEffect(() => {
    setLocalPause(pauseDuration);
  }, [pauseDuration]);

  useEffect(() => {
    setLocalLoops(loopCount);
  }, [loopCount]);

  useEffect(() => {
    setLocalTrigger(chatTrigger);
  }, [chatTrigger]);

  const handleDelete = useCallback(async (id: string) => {
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
  }, [onDelete, toast]);

  const handleToggleActive = useCallback(async (id: string, currentActive: boolean) => {
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
  }, [onToggleActive, toast]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = assignments.findIndex((a) => a.id === active.id);
      const newIndex = assignments.findIndex((a) => a.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedItems = arrayMove(assignments, oldIndex, newIndex);
        
        // Create batch update with new sequence orders
        const updates = reorderedItems.map((item, index) => ({
          id: item.id,
          sequence_order: index + 1,
        }));

        try {
          await onBatchReorder(updates);
          toast({ title: "Order updated" });
        } catch (error) {
          console.error("Reorder error:", error);
          toast({
            title: "Failed to reorder",
            variant: "destructive",
          });
        }
      }
    }
  }, [assignments, onBatchReorder, toast]);

  const handleDeleteState = useCallback(async () => {
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
  }, [onDeleteState, stateId, toast]);

  const handleSaveSettings = useCallback(async () => {
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
  }, [onUpdateSettings, stateId, localSpeed, localPause, localLoops, localTrigger, toast]);

  const handleUpdateOffset = useCallback(async (id: string, offset: number) => {
    try {
      await onUpdateOffset(id, offset);
    } catch (error) {
      console.error("Update offset error:", error);
      toast({
        title: "Failed to update offset",
        variant: "destructive",
      });
    }
  }, [onUpdateOffset, toast]);

  // Debounced speed change
  const handleSpeedChange = useCallback((values: number[]) => {
    setLocalSpeed(values[0]);
  }, []);

  const getChatTriggerLabel = useCallback((trigger: string | null) => {
    if (!trigger) return "(none) - Manual only";
    const labels: Record<string, string> = {
      page_load: "🎬 Page Load - Initial greeting",
      awaiting_input: "⏸️ Awaiting Input - Waiting for user",
      processing_input: "🔍 Processing Input - Thinking",
      streaming_response: "💬 Streaming Response - Talking",
      response_complete: "✅ Response Complete - Finished",
    };
    return labels[trigger] || trigger;
  }, []);

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
                onValueChange={handleSpeedChange}
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

        {/* Image List */}
        {assignments.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={assignments.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <SortableImageItem
                    key={assignment.id}
                    assignment={assignment}
                    state={state}
                    isLoading={loading === assignment.id}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                    onUpdateOffset={handleUpdateOffset}
                    onUpdateScale={onUpdateScale}
                    onApplyGlobalScale={onApplyGlobalScale}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Always show uploader at bottom */}
        <QuickImageUploader
          stateKey={state}
          lookId={lookId || null}
          nextSequence={assignments.length + 1}
          onComplete={() => onRefresh?.()}
        />
      </CardContent>
    </Card>
  );
});

StateAssignmentCard.displayName = "StateAssignmentCard";
