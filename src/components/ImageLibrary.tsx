import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AnimationState } from "@/hooks/useBobAnimation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImageLibraryProps {
  uploadedImages: string[];
  onAssign: (imageUrl: string, state: AnimationState, description?: string) => Promise<void>;
  onDelete: (imageUrl: string) => Promise<void>;
}

const stateOptions: { value: AnimationState; label: string }[] = [
  { value: "idle", label: "Idle" },
  { value: "thinking", label: "Thinking" },
  { value: "talking", label: "Talking" },
  { value: "happy", label: "Happy" },
  { value: "complete", label: "Complete" },
];

export const ImageLibrary = ({ uploadedImages, onAssign, onDelete }: ImageLibraryProps) => {
  const [selectedStates, setSelectedStates] = useState<Record<string, AnimationState>>({});
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAssign = async (imageUrl: string) => {
    const state = selectedStates[imageUrl];
    if (!state) {
      toast({
        title: "Please select a state",
        variant: "destructive",
      });
      return;
    }

    setLoading(imageUrl);
    try {
      await onAssign(imageUrl, state, descriptions[imageUrl]);
      toast({ title: "Image assigned successfully" });
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
    } catch (error) {
      console.error("Assign error:", error);
      toast({
        title: "Failed to assign image",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (imageUrl: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    setLoading(imageUrl);
    try {
      const fileName = imageUrl.split("/").pop();
      if (fileName) {
        await supabase.storage.from("bob-images").remove([fileName]);
      }
      await onDelete(imageUrl);
      toast({ title: "Image deleted" });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Failed to delete image",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {uploadedImages.map((imageUrl) => (
        <div key={imageUrl} className="border rounded-lg p-4 space-y-4 bg-card">
          <div className="aspect-square bg-muted rounded-md overflow-hidden">
            <img
              src={imageUrl}
              alt="Uploaded Bob"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="space-y-2">
            <Select
              value={selectedStates[imageUrl] || ""}
              onValueChange={(value) =>
                setSelectedStates((prev) => ({
                  ...prev,
                  [imageUrl]: value as AnimationState,
                }))
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
                setDescriptions((prev) => ({
                  ...prev,
                  [imageUrl]: e.target.value,
                }))
              }
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleAssign(imageUrl)}
                disabled={!selectedStates[imageUrl] || loading === imageUrl}
                className="flex-1"
              >
                Assign
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleDelete(imageUrl)}
                disabled={loading === imageUrl}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
