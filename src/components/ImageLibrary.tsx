import { useState } from "react";
import { Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AnimationState } from "@/hooks/useBobAnimation";
import { useToast } from "@/hooks/use-toast";

interface ImageLibraryProps {
  uploadedImages: string[];
  onAssign: (imageUrl: string, state: AnimationState, description?: string) => Promise<void>;
  onDelete: (imageUrl: string) => Promise<void>;
  assignedImageUrls: string[];
}

const stateOptions: { value: AnimationState; label: string }[] = [
  { value: "idle", label: "Idle" },
  { value: "thinking", label: "Thinking" },
  { value: "talking", label: "Talking" },
  { value: "happy", label: "Happy" },
  { value: "complete", label: "Complete" },
];

export const ImageLibrary = ({ uploadedImages, onAssign, onDelete, assignedImageUrls }: ImageLibraryProps) => {
  const [selectedStates, setSelectedStates] = useState<Record<string, AnimationState>>({});
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleAssign = async (imageUrl: string, quickState?: AnimationState) => {
    const state = quickState || selectedStates[imageUrl];
    const description = descriptions[imageUrl];
    
    if (!state) {
      toast({
        title: "Select a state",
        description: "Please select an animation state before assigning.",
        variant: "destructive",
      });
      return;
    }

    setLoading((prev) => ({ ...prev, [imageUrl]: true }));

    try {
      await onAssign(imageUrl, state, description);
      toast({
        title: "Success",
        description: `Image assigned to ${state} state.`,
      });
      // Clear selections after successful assignment
      setSelectedStates((prev) => {
        const newStates = { ...prev };
        delete newStates[imageUrl];
        return newStates;
      });
      setDescriptions((prev) => {
        const newDesc = { ...prev };
        delete newDesc[imageUrl];
        return newDesc;
      });
    } catch (error: any) {
      console.error("Assignment error:", error);
      toast({
        title: "Assignment failed",
        description: error?.message || "Failed to assign image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, [imageUrl]: false }));
    }
  };

  const handleDelete = async (imageUrl: string) => {
    const isAssigned = assignedImageUrls.includes(imageUrl);
    
    const confirmMessage = isAssigned
      ? "This image is assigned to an animation state. Are you sure you want to delete it?"
      : "Are you sure you want to delete this image?";

    if (!confirm(confirmMessage)) {
      return;
    }

    setLoading((prev) => ({ ...prev, [imageUrl]: true }));

    try {
      await onDelete(imageUrl);
      toast({
        title: "Success",
        description: "Image deleted successfully.",
      });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Delete failed",
        description: error?.message || "Failed to delete image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, [imageUrl]: false }));
    }
  };

  if (uploadedImages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No unassigned images. Upload images to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {uploadedImages.map((imageUrl) => {
        const isAssigned = assignedImageUrls.includes(imageUrl);
        
        return (
          <Card key={imageUrl}>
            <CardContent className="p-4">
              <div className="relative">
                <img
                  src={imageUrl}
                  alt="Uploaded Bob"
                  className="w-full h-48 object-contain rounded-md mb-4 bg-muted"
                />
                {isAssigned && (
                  <Badge className="absolute top-2 right-2" variant="secondary">
                    <Check className="w-3 h-3 mr-1" />
                    Assigned
                  </Badge>
                )}
              </div>
              
              <div className="space-y-3">
                <Select
                  value={selectedStates[imageUrl] || ""}
                  onValueChange={(value) =>
                    setSelectedStates((prev) => ({ ...prev, [imageUrl]: value as AnimationState }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {stateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Description (optional)"
                  value={descriptions[imageUrl] || ""}
                  onChange={(e) =>
                    setDescriptions((prev) => ({ ...prev, [imageUrl]: e.target.value }))
                  }
                />

                <div className="grid grid-cols-3 gap-2">
                  {stateOptions.slice(0, 3).map((option) => (
                    <Button
                      key={option.value}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssign(imageUrl, option.value as AnimationState)}
                      disabled={loading[imageUrl]}
                      className="text-xs"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAssign(imageUrl)}
                    disabled={loading[imageUrl] || !selectedStates[imageUrl]}
                    className="flex-1"
                  >
                    Assign
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(imageUrl)}
                    disabled={loading[imageUrl]}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
