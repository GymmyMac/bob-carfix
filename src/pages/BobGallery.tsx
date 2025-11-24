import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { AdminButton } from "@/components/AdminButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploader } from "@/components/ImageUploader";
import { ImageLibrary } from "@/components/ImageLibrary";
import { StateAssignmentCard } from "@/components/StateAssignmentCard";
import { AnimationPreview } from "@/components/AnimationPreview";
import { useBobAnimationConfig } from "@/hooks/useBobAnimationConfig";
import { AnimationState } from "@/hooks/useBobAnimation";

const stateConfig: {
  state: AnimationState;
  title: string;
  description: string;
}[] = [
  {
    state: "idle",
    title: "Idle State",
    description: "Default state - Anything else I can help with?",
  },
  {
    state: "thinking",
    title: "Thinking State",
    description: "Used when researching or processing information",
  },
  {
    state: "talking",
    title: "Talking State",
    description: "Used during conversational responses",
  },
  {
    state: "happy",
    title: "Happy State",
    description: "Welcome, thank you, completing sales, being happy/laughing",
  },
  {
    state: "complete",
    title: "Complete State",
    description: "Thank you, all done, great to see you come back soon",
  },
];

const BobGallery = () => {
  const {
    configs,
    uploadedImages,
    loading,
    uploadImage,
    assignImageToState,
    updateAnimation,
    deleteAnimation,
    deleteUnassignedImage,
  } = useBobAnimationConfig();

  const [activeTab, setActiveTab] = useState("upload");

  // Get assigned image URLs
  const assignedImageUrls = configs.map((c) => c.image_url);
  
  // Calculate unassigned images (images in storage but not in database)
  const unassignedImages = uploadedImages.filter(
    (url) => !assignedImageUrls.includes(url)
  );

  const getAssignmentsByState = (state: AnimationState) => {
    return configs
      .filter((c) => c.animation_state === state)
      .sort((a, b) => a.sequence_order - b.sequence_order);
  };

  const handleUploadComplete = (imageUrl: string) => {
    console.log("Image uploaded:", imageUrl);
    // Data is already refreshed in the uploadImage function
  };

  const handleReorder = async (id: string, newOrder: number) => {
    const config = configs.find((c) => c.id === id);
    if (!config) return;

    const sameStateConfigs = configs.filter(
      (c) => c.animation_state === config.animation_state
    );

    // Update orders for affected items
    const updates = sameStateConfigs.map(async (c) => {
      if (c.id === id) {
        return updateAnimation(id, { sequence_order: newOrder });
      } else if (
        c.sequence_order === newOrder &&
        newOrder < config.sequence_order
      ) {
        return updateAnimation(c.id, { sequence_order: c.sequence_order + 1 });
      } else if (
        c.sequence_order === newOrder &&
        newOrder > config.sequence_order
      ) {
        return updateAnimation(c.id, { sequence_order: c.sequence_order - 1 });
      }
    });

    await Promise.all(updates.filter(Boolean));
  };

  const handleAssignImage = async (
    imageUrl: string,
    state: AnimationState,
    description?: string
  ) => {
    const existingAssignments = getAssignmentsByState(state);
    const nextSequence = existingAssignments.length + 1;
    await assignImageToState(imageUrl, state, nextSequence, description);
    // Data is already refreshed in the assignImageToState function
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Bob Animation Admin
            </h1>
            <p className="text-muted-foreground">
              Upload and manage Bob's animation states
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AdminButton />
            <NavLink to="/">
              <Button>Back to Home</Button>
            </NavLink>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="library">Image Library</TabsTrigger>
            <TabsTrigger value="assign">Assign to States</TabsTrigger>
            <TabsTrigger value="preview">Live Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <ImageUploader
              onUpload={uploadImage}
              onUploadComplete={handleUploadComplete}
            />
          </TabsContent>

          <TabsContent value="library" className="space-y-6">
            <ImageLibrary
              uploadedImages={unassignedImages}
              onAssign={handleAssignImage}
              onDelete={deleteUnassignedImage}
              assignedImageUrls={assignedImageUrls}
            />
          </TabsContent>

          <TabsContent value="assign" className="space-y-6">
            {stateConfig.map((config) => (
              <StateAssignmentCard
                key={config.state}
                state={config.state}
                title={config.title}
                description={config.description}
                assignments={getAssignmentsByState(config.state)}
                onDelete={deleteAnimation}
                onToggleActive={(id, isActive) =>
                  updateAnimation(id, { is_active: isActive })
                }
                onReorder={handleReorder}
              />
            ))}
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <AnimationPreview />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BobGallery;
