import React, { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Wand2, Loader2, Check, X, GripVertical, Trash2, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBobAnimationConfig, StateDefinition } from "@/hooks/useBobAnimationConfig";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface AnalyzedImage {
  filename: string;
  file: File;
  preview: string;
  state_key: string;
  state_title: string;
  sequence_order: number;
  suggested_speed: number;
  description: string;
}

interface GroupedState {
  state_key: string;
  state_title: string;
  suggested_speed: number;
  images: AnalyzedImage[];
}

interface AIAnimationBuilderProps {
  lookId: string | null;
  onComplete?: () => void;
}

// Sortable image item component
const SortableImageItem = memo(({ 
  image, 
  currentStateKey,
  availableStates,
  onRemove,
  onUpdateDescription,
  onMoveToState,
}: { 
  image: AnalyzedImage; 
  currentStateKey: string;
  availableStates: Array<{ state_key: string; state_title: string }>;
  onRemove: () => void;
  onUpdateDescription: (desc: string) => void;
  onMoveToState: (targetStateKey: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.filename });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Filter out current state from available options
  const otherStates = availableStates.filter(s => s.state_key !== currentStateKey);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border"
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <img
        src={image.preview}
        alt={image.filename}
        className="w-12 h-12 object-contain rounded border bg-background"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{image.filename}</p>
        <Input
          value={image.description}
          onChange={(e) => onUpdateDescription(e.target.value)}
          placeholder="Description..."
          className="h-6 text-xs mt-1"
        />
      </div>
      <Badge variant="secondary" className="text-xs shrink-0">
        #{image.sequence_order}
      </Badge>
      {otherStates.length > 0 && (
        <Select onValueChange={onMoveToState}>
          <SelectTrigger className="h-7 w-[100px] text-xs">
            <ArrowRight className="w-3 h-3 mr-1" />
            <span className="text-muted-foreground">Move</span>
          </SelectTrigger>
          <SelectContent>
            {otherStates.map((state) => (
              <SelectItem key={state.state_key} value={state.state_key} className="text-xs">
                {state.state_title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onRemove}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
});
SortableImageItem.displayName = "SortableImageItem";

export const AIAnimationBuilder = memo(({ lookId, onComplete }: AIAnimationBuilderProps) => {
  const [phase, setPhase] = useState<"upload" | "analyzing" | "preview" | "importing">("upload");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [analyzedImages, setAnalyzedImages] = useState<AnalyzedImage[]>([]);
  const [groupedStates, setGroupedStates] = useState<GroupedState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const { uploadImage, upsertState, assignImageToState, refetch } = useBobAnimationConfig(lookId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        validFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }
    });

    setSelectedFiles(validFiles);
    setPreviews(newPreviews);
  }, []);

  // Analyze files with AI
  const analyzeWithAI = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setPhase("analyzing");

    try {
      const filenames = selectedFiles.map((f) => f.name);

      const { data, error } = await supabase.functions.invoke("analyze-animation-batch", {
        body: { filenames },
      });

      if (error) {
        throw new Error(error.message || "Failed to analyze files");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const analyzed = data.analyzed as Array<{
        filename: string;
        state_key: string;
        state_title: string;
        sequence_order: number;
        suggested_speed: number;
        description: string;
      }>;

      // Map analyzed results to files with previews
      const analyzedWithFiles: AnalyzedImage[] = analyzed.map((item) => {
        const fileIndex = selectedFiles.findIndex((f) => f.name === item.filename);
        return {
          ...item,
          file: selectedFiles[fileIndex] || selectedFiles[0],
          preview: previews[fileIndex] || previews[0],
        };
      });

      setAnalyzedImages(analyzedWithFiles);

      // Group by state
      const groups = analyzedWithFiles.reduce((acc, img) => {
        const existing = acc.find((g) => g.state_key === img.state_key);
        if (existing) {
          existing.images.push(img);
        } else {
          acc.push({
            state_key: img.state_key,
            state_title: img.state_title,
            suggested_speed: img.suggested_speed,
            images: [img],
          });
        }
        return acc;
      }, [] as GroupedState[]);

      // Sort images within each group by sequence_order
      groups.forEach((g) => {
        g.images.sort((a, b) => a.sequence_order - b.sequence_order);
      });

      setGroupedStates(groups);
      setPhase("preview");

      toast({
        title: "Analysis Complete",
        description: `Organized ${analyzed.length} images into ${groups.length} states`,
      });
    } catch (error) {
      console.error("AI analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze images",
        variant: "destructive",
      });
      setPhase("upload");
    }
  }, [selectedFiles, previews]);

  // Handle drag end for reordering
  const handleDragEnd = useCallback((stateKey: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setGroupedStates((prev) => {
      return prev.map((group) => {
        if (group.state_key !== stateKey) return group;

        const oldIndex = group.images.findIndex((img) => img.filename === active.id);
        const newIndex = group.images.findIndex((img) => img.filename === over.id);

        const newImages = arrayMove(group.images, oldIndex, newIndex);
        // Update sequence orders
        return {
          ...group,
          images: newImages.map((img, idx) => ({ ...img, sequence_order: idx + 1 })),
        };
      });
    });
  }, []);

  // Update state title
  const updateStateTitle = useCallback((stateKey: string, newTitle: string) => {
    setGroupedStates((prev) =>
      prev.map((g) =>
        g.state_key === stateKey ? { ...g, state_title: newTitle } : g
      )
    );
  }, []);

  // Update state speed
  const updateStateSpeed = useCallback((stateKey: string, newSpeed: number) => {
    setGroupedStates((prev) =>
      prev.map((g) =>
        g.state_key === stateKey ? { ...g, suggested_speed: newSpeed } : g
      )
    );
  }, []);

  // Update image description
  const updateImageDescription = useCallback((filename: string, description: string) => {
    setGroupedStates((prev) =>
      prev.map((g) => ({
        ...g,
        images: g.images.map((img) =>
          img.filename === filename ? { ...img, description } : img
        ),
      }))
    );
  }, []);

  // Remove image from a group
  const removeImage = useCallback((stateKey: string, filename: string) => {
    setGroupedStates((prev) => {
      const updated = prev.map((g) => {
        if (g.state_key !== stateKey) return g;
        return {
          ...g,
          images: g.images
            .filter((img) => img.filename !== filename)
            .map((img, idx) => ({ ...img, sequence_order: idx + 1 })),
        };
      });
      // Remove empty groups
      return updated.filter((g) => g.images.length > 0);
    });
  }, []);

  // Delete entire state group
  const deleteStateGroup = useCallback((stateKey: string) => {
    setGroupedStates((prev) => prev.filter((g) => g.state_key !== stateKey));
  }, []);

  // Move image from one state to another
  const moveImageToState = useCallback((sourceStateKey: string, filename: string, targetStateKey: string) => {
    setGroupedStates((prev) => {
      // Find the image to move
      const sourceGroup = prev.find((g) => g.state_key === sourceStateKey);
      const imageToMove = sourceGroup?.images.find((img) => img.filename === filename);
      
      if (!imageToMove) return prev;

      return prev
        .map((group) => {
          if (group.state_key === sourceStateKey) {
            // Remove from source, reorder remaining
            const newImages = group.images
              .filter((img) => img.filename !== filename)
              .map((img, idx) => ({ ...img, sequence_order: idx + 1 }));
            return { ...group, images: newImages };
          }
          if (group.state_key === targetStateKey) {
            // Add to target at end, update its state info
            const movedImage = { 
              ...imageToMove, 
              state_key: targetStateKey,
              state_title: group.state_title,
              sequence_order: group.images.length + 1 
            };
            return { ...group, images: [...group.images, movedImage] };
          }
          return group;
        })
        .filter((g) => g.images.length > 0); // Remove empty groups
    });
  }, []);

  // Import all to database
  const importAll = useCallback(async () => {
    setPhase("importing");
    setImportProgress(0);

    const totalImages = groupedStates.reduce((sum, g) => sum + g.images.length, 0);
    let processedCount = 0;

    try {
      for (const group of groupedStates) {
        // Create/update the state first
        const stateData: StateDefinition = {
          reactionType: group.state_key,
          name: group.state_title,
          description: `${group.images.length} animation frames`,
          displayOrder: groupedStates.indexOf(group) + 1,
          sequenceOrder: 1,
        };

        await upsertState(stateData, lookId);

        // Update state animation speed
        // This would require updating the state settings - for now we handle via upsertState

        // Upload and assign each image
        for (const image of group.images) {
          try {
            const imageUrl = await uploadImage(image.file);
            await assignImageToState(
              imageUrl,
              group.state_key,
              image.sequence_order,
              image.description,
              lookId
            );
            processedCount++;
            setImportProgress(Math.round((processedCount / totalImages) * 100));
          } catch (imgError) {
            console.error(`Failed to upload ${image.filename}:`, imgError);
          }
        }
      }

      await refetch();

      toast({
        title: "Import Complete",
        description: `Successfully imported ${processedCount} images into ${groupedStates.length} states`,
      });

      // Reset and notify parent
      setPhase("upload");
      setSelectedFiles([]);
      setPreviews([]);
      setAnalyzedImages([]);
      setGroupedStates([]);
      onComplete?.();
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import images",
        variant: "destructive",
      });
      setPhase("preview");
    }
  }, [groupedStates, lookId, uploadImage, upsertState, assignImageToState, refetch, onComplete]);

  // Reset to upload phase
  const resetToUpload = useCallback(() => {
    setPhase("upload");
    setSelectedFiles([]);
    setPreviews([]);
    setAnalyzedImages([]);
    setGroupedStates([]);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-5 h-5" />
          AI Animation Builder
        </CardTitle>
        <CardDescription>
          Upload multiple images and let AI organize them into animation states automatically
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* UPLOAD PHASE */}
        {phase === "upload" && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileSelect(e.dataTransfer.files);
              }}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop multiple images here, or click to browse
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id="ai-builder-input"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("ai-builder-input")?.click()}
              >
                Select Images
              </Button>
            </div>

            {selectedFiles.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedFiles.length} images selected
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setSelectedFiles([]);
                    setPreviews([]);
                  }}>
                    Clear
                  </Button>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {previews.slice(0, 12).map((preview, idx) => (
                    <div key={idx} className="aspect-square rounded border overflow-hidden bg-muted">
                      <img
                        src={preview}
                        alt={selectedFiles[idx]?.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ))}
                  {selectedFiles.length > 12 && (
                    <div className="aspect-square rounded border flex items-center justify-center bg-muted text-muted-foreground text-sm">
                      +{selectedFiles.length - 12}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={analyzeWithAI}
                  disabled={selectedFiles.length === 0}
                >
                  <Wand2 className="w-4 h-4" />
                  Analyze with AI
                </Button>
              </>
            )}
          </div>
        )}

        {/* ANALYZING PHASE */}
        {phase === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">
              AI is analyzing {selectedFiles.length} images...
            </p>
            <p className="text-xs text-muted-foreground">
              Detecting states, sequences, and optimal settings
            </p>
          </div>
        )}

        {/* PREVIEW PHASE */}
        {phase === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                AI organized your images into {groupedStates.length} animation states
              </p>
              <Button variant="ghost" size="sm" onClick={resetToUpload}>
                Start Over
              </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {groupedStates.map((group) => (
                  <Card key={group.state_key} className="border-muted">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              value={group.state_title}
                              onChange={(e) => updateStateTitle(group.state_key, e.target.value)}
                              className="h-7 font-medium"
                            />
                            <Badge variant="outline" className="shrink-0">
                              {group.state_key}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <Label className="text-xs text-muted-foreground shrink-0">
                              Speed: {group.suggested_speed}ms
                            </Label>
                            <Slider
                              value={[group.suggested_speed]}
                              onValueChange={([v]) => updateStateSpeed(group.state_key, v)}
                              min={100}
                              max={800}
                              step={50}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteStateGroup(group.state_key)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 px-4 pb-4">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(group.state_key, e)}
                      >
                        <SortableContext
                          items={group.images.map((img) => img.filename)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {group.images.map((image) => (
                              <SortableImageItem
                                key={image.filename}
                                image={image}
                                currentStateKey={group.state_key}
                                availableStates={groupedStates.map(g => ({ state_key: g.state_key, state_title: g.state_title }))}
                                onRemove={() => removeImage(group.state_key, image.filename)}
                                onUpdateDescription={(desc) =>
                                  updateImageDescription(image.filename, desc)
                                }
                                onMoveToState={(targetKey) => moveImageToState(group.state_key, image.filename, targetKey)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={resetToUpload}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={importAll}
                disabled={groupedStates.length === 0}
              >
                <Check className="w-4 h-4" />
                Apply & Import All ({groupedStates.reduce((sum, g) => sum + g.images.length, 0)} images)
              </Button>
            </div>
          </div>
        )}

        {/* IMPORTING PHASE */}
        {phase === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Importing images...</p>
            <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{importProgress}% complete</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

AIAnimationBuilder.displayName = "AIAnimationBuilder";
