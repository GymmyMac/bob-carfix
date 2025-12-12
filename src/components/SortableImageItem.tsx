import React, { memo, useCallback, useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { BobAnimationConfig } from "@/hooks/useBobAnimationConfig";

interface SortableImageItemProps {
  assignment: BobAnimationConfig;
  state: string;
  isLoading: boolean;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onUpdateOffset: (id: string, offset: number) => void;
}

export const SortableImageItem = memo(({
  assignment,
  state,
  isLoading,
  onDelete,
  onToggleActive,
  onUpdateOffset,
}: SortableImageItemProps) => {
  const [editingOffset, setEditingOffset] = useState(false);
  const [localOffset, setLocalOffset] = useState(assignment.vertical_offset);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isEditingRef = useRef(false); // Track if user is actively editing to prevent sync

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
    isEditingRef.current = true; // Mark as editing to prevent sync
    setLocalOffset(newOffset);
    
    // Debounce the actual update
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onUpdateOffset(assignment.id, newOffset);
    }, 300);
  }, [onUpdateOffset, assignment.id]);

  const handleSaveOffset = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    onUpdateOffset(assignment.id, localOffset);
    isEditingRef.current = false; // Done editing, allow sync
    setEditingOffset(false);
  }, [onUpdateOffset, assignment.id, localOffset]);

  const handleCancelOffset = useCallback(() => {
    isEditingRef.current = false; // Done editing, allow sync
    setLocalOffset(assignment.vertical_offset); // Reset to original
    setEditingOffset(false);
  }, [assignment.vertical_offset]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Sync local offset when assignment changes - but only if not actively editing
  useEffect(() => {
    if (!isEditingRef.current) {
      setLocalOffset(assignment.vertical_offset);
    }
  }, [assignment.vertical_offset]);

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
            {assignment.is_active ? "Active" : "Inactive"} • Offset: {assignment.vertical_offset}%
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
            <Label className="text-xs">Vertical Offset (%)</Label>
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
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditingOffset(true)}
          className="w-full text-xs"
        >
          Adjust Vertical Position
        </Button>
      )}
    </div>
  );
});

SortableImageItem.displayName = "SortableImageItem";
