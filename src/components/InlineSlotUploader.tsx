import React, { useState, useRef, useCallback } from "react";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InlineSlotUploaderProps {
  stateKey: string;
  lookId: string | null;
  sequenceNumber: number;
  onComplete: () => void;
  onCancel: () => void;
}

export const InlineSlotUploader: React.FC<InlineSlotUploaderProps> = ({
  stateKey,
  lookId,
  sequenceNumber,
  onComplete,
  onCancel,
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("bob-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("bob-images")
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Insert into bob_animations with the EXACT sequence number (replacement)
      const { error: insertError } = await supabase
        .from("bob_animations")
        .insert({
          animation_state: stateKey,
          image_url: imageUrl,
          sequence_order: sequenceNumber,
          look_id: lookId,
          is_active: true,
        });

      if (insertError) throw insertError;

      toast({ title: `Sequence ${sequenceNumber} replaced` });
      onComplete();
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", variant: "destructive" });
      setPreview(null);
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

  return (
    <div
      className={`flex items-center gap-4 p-4 border-2 border-dashed rounded-lg transition-all ${
        dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 bg-muted/20"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Placeholder for drag handle alignment */}
      <div className="w-5" />

      {/* Upload area matching image thumbnail size (doubled) */}
      <div
        className="w-40 h-40 bg-muted rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-contain" />
        ) : uploading ? (
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        ) : (
          <Upload className="w-10 h-10 text-muted-foreground" />
        )}
      </div>

      {/* Info text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Sequence {sequenceNumber}</p>
        <p className="text-xs text-muted-foreground">
          {uploading ? "Uploading..." : "Click or drag image to replace"}
        </p>
      </div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        disabled={uploading}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
        aria-label="Cancel replacement"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
        disabled={uploading}
      />
    </div>
  );
};
