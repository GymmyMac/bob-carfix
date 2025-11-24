import { useState, useCallback } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ImageUploaderProps {
  onUpload: (file: File) => Promise<string>;
  onUploadComplete?: (imageUrl: string) => void;
}

export const ImageUploader = ({ onUpload, onUploadComplete }: ImageUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
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
    const maxSize = 5 * 1024 * 1024; // 5MB

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

  const handleFile = async (file: File) => {
    if (!validateFile(file)) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const imageUrl = await onUpload(file);
      toast({
        title: "Upload successful",
        description: "Image uploaded! View it in the Image Library tab.",
      });
      onUploadComplete?.(imageUrl);
      setPreview(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMessage = error?.message || "Failed to upload image. Please try again.";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [onUpload]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="space-y-4">
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
            onClick={() => setPreview(null)}
            disabled={uploading}
          >
            <X className="w-4 h-4" />
          </Button>
          <img
            src={preview}
            alt="Preview"
            className="w-full max-w-xs mx-auto rounded-md"
          />
          {uploading && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
