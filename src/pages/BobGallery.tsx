import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { AdminButton } from "@/components/AdminButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploaderWithState } from "@/components/ImageUploaderWithState";
import { StateAssignmentCard } from "@/components/StateAssignmentCard";
import { AnimationPreview } from "@/components/AnimationPreview";
import { useBobAnimationConfig, AnimationState } from "@/hooks/useBobAnimationConfig";

const BobGallery = () => {
  const {
    configs,
    states,
    loading,
    uploadImageWithState,
    updateAnimation,
    deleteAnimation,
    deleteState,
  } = useBobAnimationConfig();

  const [activeTab, setActiveTab] = useState("upload");

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload & Define</TabsTrigger>
            <TabsTrigger value="assign">Assign to States</TabsTrigger>
            <TabsTrigger value="preview">Live Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <ImageUploaderWithState
              onUpload={uploadImageWithState}
              onUploadComplete={(url) => console.log("Uploaded:", url)}
            />
          </TabsContent>

          <TabsContent value="assign" className="space-y-6">
            {states
              .filter((s) => s.is_active)
              .sort((a, b) => a.display_order - b.display_order)
              .map((state) => (
                <StateAssignmentCard
                  key={state.id}
                  stateId={state.id}
                  state={state.state_key}
                  title={state.title}
                  description={state.description || ""}
                  assignments={getAssignmentsByState(state.state_key)}
                  onDelete={deleteAnimation}
                  onDeleteState={deleteState}
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
