import { useState, useCallback } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { StateDefinition } from "@/hooks/useBobAnimationConfig";

interface ImageUploaderWithStateProps {
  onUpload: (file: File, stateData: StateDefinition) => Promise<string>;
  onUploadComplete?: (imageUrl: string) => void;
}

export const ImageUploaderWithState = ({
  onUpload,
  onUploadComplete,
}: ImageUploaderWithStateProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [displayOrder, setDisplayOrder] = useState("1");
  const [reactionType, setReactionType] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sequenceOrder, setSequenceOrder] = useState("1");
  
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): boolean => {
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    const maxSize = 5 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PNG, JPG, or WEBP images only.",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (!validateFile(file)) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate reaction type from name
    const autoKey = value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_");
    if (!reactionType || reactionType === name.toLowerCase().replace(/\s+/g, "_")) {
      setReactionType(autoKey);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select an image first.",
        variant: "destructive",
      });
      return;
    }

    if (!reactionType.trim()) {
      toast({
        title: "Reaction Type required",
        description: "Please enter a reaction type (state key).",
        variant: "destructive",
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a display name for the state.",
        variant: "destructive",
      });
      return;
    }

    const orderNum = parseInt(displayOrder);
    const seqNum = parseInt(sequenceOrder);

    if (isNaN(orderNum) || orderNum < 1) {
      toast({
        title: "Invalid display order",
        description: "Display order must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(seqNum) || seqNum < 1) {
      toast({
        title: "Invalid sequence order",
        description: "Sequence order must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const imageUrl = await onUpload(selectedFile, {
        reactionType: reactionType.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        displayOrder: orderNum,
        sequenceOrder: seqNum,
      });

      toast({
        title: "Success!",
        description: `State "${name}" created with image!`,
      });

      onUploadComplete?.(imageUrl);

      // Reset form
      setPreview(null);
      setSelectedFile(null);
      setDisplayOrder("1");
      setReactionType("");
      setName("");
      setDescription("");
      setSequenceOrder("1");
    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMessage =
        error?.message || "Failed to upload image. Please try again.";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileInput}
          disabled={uploading}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">
            Drop your Bob image here, or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            PNG, JPG, or WEBP (max 5MB)
          </p>
        </label>
      </div>

      {preview && (
        <div className="relative border rounded-lg p-4 bg-card">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => {
              setPreview(null);
              setSelectedFile(null);
            }}
            disabled={uploading}
          >
            <X className="w-4 h-4" />
          </Button>
          <img
            src={preview}
            alt="Preview"
            className="w-full max-w-xs mx-auto rounded-md"
          />
        </div>
      )}

      {selectedFile && (
        <div className="border rounded-lg p-6 bg-card space-y-4">
          <h3 className="text-lg font-semibold">State Definition</h3>

          <div className="space-y-2">
            <Label htmlFor="displayOrder">Number (Display Order)</Label>
            <Input
              id="displayOrder"
              type="number"
              min="1"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              placeholder="1"
            />
            <p className="text-xs text-muted-foreground">
              Order in which this state appears in lists
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name (Display Title)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Happy State"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Friendly name shown to admins
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reactionType">Reaction Type (State Key)</Label>
            <Input
              id="reactionType"
              value={reactionType}
              onChange={(e) =>
                setReactionType(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                )
              }
              placeholder="e.g., happy"
            />
            <p className="text-xs text-muted-foreground">
              Internal key used in code (lowercase, underscores only)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Used when Bob is happy or laughing"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sequenceOrder">Sequence Order (within state)</Label>
            <Input
              id="sequenceOrder"
              type="number"
              min="1"
              value={sequenceOrder}
              onChange={(e) => setSequenceOrder(e.target.value)}
              placeholder="1"
            />
            <p className="text-xs text-muted-foreground">
              Order of this image if state has multiple images
            </p>
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? "Uploading..." : "Upload & Create State"}
          </Button>
        </div>
      )}
    </div>
  );
};
