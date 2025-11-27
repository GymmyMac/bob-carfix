import { useState } from "react";
import { useBobBackdrop } from "@/hooks/useBobBackdrop";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Upload, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

export const BackdropManager = () => {
  const {
    backdrops,
    activeBackdrop,
    isLoading,
    uploadBackdrop,
    setActiveBackdrop,
    deleteBackdrop,
  } = useBobBackdrop();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backdropName, setBackdropName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setBackdropName(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = () => {
    if (!selectedFile || !backdropName.trim()) {
      toast.error("Please select a file and enter a name");
      return;
    }

    uploadBackdrop({ file: selectedFile, name: backdropName.trim() });
    setSelectedFile(null);
    setPreviewUrl("");
    setBackdropName("");
  };

  return (
    <div className="space-y-6">
      {/* Current Active Backdrop */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Current Active Backdrop</h3>
        {activeBackdrop ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{activeBackdrop.name}</p>
            <img
              src={activeBackdrop.image_url}
              alt={activeBackdrop.name}
              className="w-full h-48 object-cover rounded-lg border border-border"
            />
            <Button
              onClick={() => setActiveBackdrop(null)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Clear Active Backdrop
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No backdrop active</p>
        )}
      </Card>

      {/* Upload New Backdrop */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Upload New Backdrop</h3>
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag & drop an image here, or click to select
            </p>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="max-w-xs mx-auto"
            />
          </div>

          {previewUrl && (
            <div className="space-y-3">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg border border-border"
              />
              <div>
                <Label htmlFor="backdrop-name">Backdrop Name</Label>
                <Input
                  id="backdrop-name"
                  value={backdropName}
                  onChange={(e) => setBackdropName(e.target.value)}
                  placeholder="e.g., Summer Sale 2024"
                />
              </div>
              <Button onClick={handleUpload} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Upload Backdrop
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Available Backdrops */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Available Backdrops</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : backdrops.length === 0 ? (
          <p className="text-sm text-muted-foreground">No backdrops uploaded yet</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {backdrops.map((backdrop) => (
              <div key={backdrop.id} className="relative group">
                <img
                  src={backdrop.image_url}
                  alt={backdrop.name}
                  className={`w-full h-32 object-cover rounded-lg border-2 transition-all ${
                    backdrop.is_active
                      ? "border-primary ring-2 ring-primary"
                      : "border-border"
                  }`}
                />
                {backdrop.is_active && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
                <p className="text-xs mt-1 truncate">{backdrop.name}</p>
                <div className="flex gap-2 mt-2">
                  {!backdrop.is_active && (
                    <Button
                      onClick={() => setActiveBackdrop(backdrop.id)}
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                    >
                      Set Active
                    </Button>
                  )}
                  <Button
                    onClick={() => deleteBackdrop(backdrop.id)}
                    size="sm"
                    variant="destructive"
                    className="flex-1 text-xs"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
