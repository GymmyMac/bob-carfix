import React, { memo, useCallback, useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Move, ZoomIn, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BobAnimationConfig } from "@/hooks/useBobAnimationConfig";

interface SortableImageItemProps {
  assignment: BobAnimationConfig;
  state: string;
  isLoading: boolean;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onUpdateOffset: (id: string, offset: number) => void;
  onUpdateScale: (id: string, scale: number) => void;
  onApplyGlobalScale?: (scale: number) => Promise<void>;
}

export const SortableImageItem = memo(({
  assignment,
  state,
  isLoading,
  onDelete,
  onToggleActive,
  onUpdateOffset,
  onUpdateScale,
  onApplyGlobalScale,
}: SortableImageItemProps) => {
  const [editingOffset, setEditingOffset] = useState(false);
  const [editingScale, setEditingScale] = useState(false);
  const [localOffset, setLocalOffset] = useState(assignment.vertical_offset);
  const [localScale, setLocalScale] = useState(assignment.scale ?? 100);
  const [applyGlobally, setApplyGlobally] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const scaleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isEditingRef = useRef(false);
  const isEditingScaleRef = useRef(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: assignment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  const handleDelete = useCallback(() => {
    onDelete(assignment.id);
  }, [onDelete, assignment.id]);

  const handleToggle = useCallback(() => {
    onToggleActive(assignment.id, assignment.is_active);
  }, [onToggleActive, assignment.id, assignment.is_active]);

  const handleOffsetChange = useCallback((values: number[]) => {
    const newOffset = values[0];
    isEditingRef.current = true;
    setLocalOffset(newOffset);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onUpdateOffset(assignment.id, newOffset);
    }, 300);
  }, [onUpdateOffset, assignment.id]);

  const handleScaleChange = useCallback((values: number[]) => {
    const newScale = values[0];
    isEditingScaleRef.current = true;
    setLocalScale(newScale);
    
    if (scaleDebounceRef.current) {
      clearTimeout(scaleDebounceRef.current);
    }
    scaleDebounceRef.current = setTimeout(() => {
      onUpdateScale(assignment.id, newScale);
    }, 300);
  }, [onUpdateScale, assignment.id]);

  const handleSaveOffset = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    onUpdateOffset(assignment.id, localOffset);
    isEditingRef.current = false;
    setEditingOffset(false);
  }, [onUpdateOffset, assignment.id, localOffset]);

  const handleCancelOffset = useCallback(() => {
    isEditingRef.current = false;
    setLocalOffset(assignment.vertical_offset);
    setEditingOffset(false);
  }, [assignment.vertical_offset]);

  const handleSaveScale = useCallback(() => {
    if (scaleDebounceRef.current) {
      clearTimeout(scaleDebounceRef.current);
    }
    onUpdateScale(assignment.id, localScale);
    isEditingScaleRef.current = false;
    setEditingScale(false);
    setApplyGlobally(false);
  }, [onUpdateScale, assignment.id, localScale]);

  const handleSaveGlobalScale = useCallback(async () => {
    if (!onApplyGlobalScale) return;
    setSavingGlobal(true);
    try {
      await onApplyGlobalScale(localScale);
      isEditingScaleRef.current = false;
      setEditingScale(false);
      setApplyGlobally(false);
    } finally {
      setSavingGlobal(false);
    }
  }, [onApplyGlobalScale, localScale]);

  const handleCancelScale = useCallback(() => {
    isEditingScaleRef.current = false;
    setLocalScale(assignment.scale ?? 100);
    setEditingScale(false);
    setApplyGlobally(false);
  }, [assignment.scale]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (scaleDebounceRef.current) {
        clearTimeout(scaleDebounceRef.current);
      }
    };
  }, []);

  // Sync local offset when assignment changes - but only if not actively editing
  useEffect(() => {
    if (!isEditingRef.current) {
      setLocalOffset(assignment.vertical_offset);
    }
  }, [assignment.vertical_offset]);

  // Sync local scale when assignment changes - but only if not actively editing
  useEffect(() => {
    if (!isEditingScaleRef.current) {
      setLocalScale(assignment.scale ?? 100);
    }
  }, [assignment.scale]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`space-y-3 p-4 border rounded-lg transition-all ${
        !assignment.is_active ? "opacity-50" : ""
      } ${isDragging ? "shadow-lg bg-background" : ""}`}
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="w-20 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0">
          <img
            src={assignment.image_url}
            alt={`${state} ${assignment.sequence_order}`}
            className="w-full h-full object-contain"
            loading="lazy"
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
            {assignment.is_active ? "Active" : "Inactive"} • Offset: {assignment.vertical_offset}% • Scale: {assignment.scale ?? 100}%
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            disabled={isLoading}
          >
            <span className="text-xs">
              {assignment.is_active ? "Hide" : "Show"}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isLoading}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Vertical Offset Control */}
      {editingOffset ? (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1">
              <Move className="w-3 h-3" />
              Vertical Offset (%)
            </Label>
            <span className="text-xs font-medium">{localOffset}%</span>
          </div>
          <Slider
            value={[localOffset]}
            onValueChange={handleOffsetChange}
            min={-15}
            max={15}
            step={0.5}
            className="w-full"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleSaveOffset}
              className="flex-1"
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelOffset}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : editingScale ? (
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1">
              <ZoomIn className="w-3 h-3" />
              Scale (%)
            </Label>
            <span className="text-xs font-medium">{localScale}%</span>
          </div>
          <Slider
            value={[localScale]}
            onValueChange={handleScaleChange}
            min={50}
            max={150}
            step={1}
            className="w-full"
          />
          
          {/* Apply Globally Toggle */}
          {onApplyGlobalScale && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-dashed">
              <Switch
                id={`apply-global-${assignment.id}`}
                checked={applyGlobally}
                onCheckedChange={setApplyGlobally}
                disabled={savingGlobal}
              />
              <Label 
                htmlFor={`apply-global-${assignment.id}`} 
                className="text-xs cursor-pointer flex items-center gap-1"
              >
                <Globe className="w-3 h-3" />
                Apply this scale to all animations
              </Label>
            </div>
          )}
          
          <div className="flex gap-2">
            {applyGlobally && onApplyGlobalScale ? (
              <Button
                size="sm"
                variant="default"
                onClick={handleSaveGlobalScale}
                className="flex-1 gap-1"
                disabled={savingGlobal}
              >
                <Globe className="w-3 h-3" />
                {savingGlobal ? "Applying..." : "Save as Global"}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="default"
                onClick={handleSaveScale}
                className="flex-1"
              >
                Save
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelScale}
              className="flex-1"
              disabled={savingGlobal}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingOffset(true)}
            className="flex-1 text-xs"
          >
            <Move className="w-3 h-3 mr-1" />
            Adjust Position
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingScale(true)}
            className="flex-1 text-xs"
          >
            <ZoomIn className="w-3 h-3 mr-1" />
            Adjust Scale
          </Button>
        </div>
      )}
    </div>
  );
});

SortableImageItem.displayName = "SortableImageItem";
