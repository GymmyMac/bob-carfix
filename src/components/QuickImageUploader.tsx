import React, { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";

interface QuickImageUploaderProps {
  stateKey: string;
  lookId: string | null;
  sequenceNumber: number;
  onComplete: () => void;
  compact?: boolean;
}

export const QuickImageUploader: React.FC<QuickImageUploaderProps> = ({
  stateKey,
  lookId,
  sequenceNumber,
  onComplete,
  compact = false,
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      // Upload to storage
      const fileName = `${stateKey}_${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("bob-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("bob-images")
        .getPublicUrl(fileName);

      // Insert animation record
      const { error: insertError } = await supabase
        .from("bob_animations")
        .insert({
          animation_state: stateKey,
          image_url: publicUrl,
          sequence_order: sequenceNumber,
          is_active: true,
          look_id: lookId,
          scale: 100,
          vertical_offset: 0,
        });

      if (insertError) throw insertError;

      toast({ title: "Image added to state" });
      setPreview(null);
      onComplete();
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [stateKey, lookId, sequenceNumber, onComplete, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-3 border-2 border-dashed rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
          dragOver ? "bg-primary/10 border-primary" : "bg-muted/30"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />
        {preview ? (
          <div className="relative w-16 h-16">
            <img
              src={preview}
              alt="Preview"
              className="w-16 h-16 object-contain rounded border"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="w-16 h-16 flex items-center justify-center bg-muted rounded border-2 border-dashed">
            <Upload className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-medium">Sequence #{sequenceNumber}</p>
          <p className="text-xs text-muted-foreground">Drop image or click to upload</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 border-2 border-dashed rounded-lg bg-muted/30">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
      
      <div
        className={`flex flex-col items-center gap-3 p-4 rounded transition-colors ${
          dragOver ? "bg-primary/10 border-primary" : ""
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-24 h-24 object-contain rounded border"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <>
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              Drop an image here or click to upload
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Image
            </Button>
          </>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground text-center mt-2">
        Will be added as frame #{sequenceNumber} to "{stateKey}"
      </p>
    </div>
  );
};
