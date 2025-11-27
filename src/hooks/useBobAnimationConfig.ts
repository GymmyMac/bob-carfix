import { supabase } from "@/integrations/supabase/client";
import { 
  useBobAnimationData, 
  useInvalidateBobAnimationData,
  type BobAnimationConfig,
  type AnimationStateDefinition 
} from "./useBobAnimationData";

export type AnimationState = string;
export type { BobAnimationConfig, AnimationStateDefinition };

export interface StateDefinition {
  reactionType: string;
  name: string;
  description?: string;
  displayOrder: number;
  sequenceOrder: number;
}

export const useBobAnimationConfig = () => {
  // Use centralized cached data
  const { data, isLoading } = useBobAnimationData();
  const invalidateCache = useInvalidateBobAnimationData();

  const configs = data?.configs || [];
  const states = data?.states || [];
  const uploadedImages = data?.uploadedImages || [];
  const loading = isLoading;

  const getActiveImagesByState = (state: AnimationState): string[] => {
    return configs
      .filter((c) => c.animation_state === state && c.is_active)
      .sort((a, b) => a.sequence_order - b.sequence_order)
      .map((c) => c.image_url);
  };

  const uploadImage = async (file: File) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("bob-images")
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes("Payload too large")) {
          throw new Error("File size exceeds storage limit");
        }
        throw uploadError;
      }

      const { data } = supabase.storage.from("bob-images").getPublicUrl(filePath);

      // Invalidate cache to refresh data
      invalidateCache();

      return data.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const assignImageToState = async (
    imageUrl: string,
    state: AnimationState,
    sequenceOrder: number = 1,
    description?: string
  ) => {
    try {
      const { error } = await supabase.from("bob_animations").insert({
        animation_state: state,
        image_url: imageUrl,
        sequence_order: sequenceOrder,
        description: description || null,
        is_active: true,
      });

      if (error) throw error;

      // Invalidate cache to refresh data
      invalidateCache();
    } catch (error) {
      console.error("Error assigning image:", error);
      throw error;
    }
  };

  const updateAnimation = async (
    id: string,
    updates: Partial<BobAnimationConfig>
  ) => {
    const { error } = await supabase
      .from("bob_animations")
      .update(updates)
      .eq("id", id);

    if (error) {
      throw error;
    }
  };

  const deleteAnimation = async (id: string) => {
    try {
      // Get the animation config to check if we should delete the storage file
      const config = configs.find((c) => c.id === id);
      
      // Delete from database
      const { error } = await supabase.from("bob_animations").delete().eq("id", id);
      if (error) throw error;

      // Check if any other configs use the same image URL
      if (config) {
        const otherConfigsWithSameImage = configs.filter(
          (c) => c.id !== id && c.image_url === config.image_url
        );

        // Only delete from storage if no other configs use this image
        if (otherConfigsWithSameImage.length === 0) {
          await deleteImageFromStorage(config.image_url);
        }
      }

      // Invalidate cache to refresh data
      invalidateCache();
    } catch (error) {
      console.error("Error deleting animation:", error);
      throw error;
    }
  };

  const deleteUnassignedImage = async (imageUrl: string) => {
    try {
      await deleteImageFromStorage(imageUrl);
      invalidateCache();
    } catch (error) {
      console.error("Error deleting unassigned image:", error);
      throw error;
    }
  };

  const deleteState = async (stateId: string): Promise<void> => {
    try {
      const state = states.find((s) => s.id === stateId);
      if (!state) throw new Error("State not found");

      // First, delete all animations for this state
      const stateConfigs = configs.filter(
        (c) => c.animation_state === state.state_key
      );

      for (const config of stateConfigs) {
        await deleteAnimation(config.id);
      }

      // Then delete the state
      const { error } = await supabase
        .from("animation_states")
        .delete()
        .eq("id", stateId);

      if (error) throw error;

      // Invalidate cache to refresh data
      invalidateCache();
    } catch (error) {
      console.error("Error deleting state:", error);
      throw error;
    }
  };

  const deleteImageFromStorage = async (imageUrl: string) => {
    try {
      // Extract filename from URL
      const urlParts = imageUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];

      const { error } = await supabase.storage
        .from("bob-images")
        .remove([fileName]);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting from storage:", error);
      throw error;
    }
  };

  const upsertState = async (stateData: StateDefinition) => {
    // Query database directly instead of using React state to avoid race conditions
    const { data: existing, error: fetchError } = await supabase
      .from("animation_states")
      .select("*")
      .eq("state_key", stateData.reactionType)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      // State exists - update if needed
      const updates: any = {};
      let needsUpdate = false;

      if (existing.display_order !== stateData.displayOrder) {
        updates.display_order = stateData.displayOrder;
        needsUpdate = true;
      }

      if (existing.title !== stateData.name) {
        updates.title = stateData.name;
        needsUpdate = true;
      }

      if ((existing.description || null) !== (stateData.description || null)) {
        updates.description = stateData.description || null;
        needsUpdate = true;
      }

      if (needsUpdate) {
        const { error } = await supabase
          .from("animation_states")
          .update(updates)
          .eq("id", existing.id);
        
        if (error) throw error;
      }

      return existing.id;
    } else {
      // State doesn't exist - create new one
      const { data, error } = await supabase
        .from("animation_states")
        .insert({
          state_key: stateData.reactionType,
          title: stateData.name,
          description: stateData.description || null,
          display_order: stateData.displayOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    }
  };

  const uploadImageWithState = async (file: File, stateData: StateDefinition) => {
    try {
      // Upload image first
      const imageUrl = await uploadImage(file);
      
      // Upsert state (now with direct DB query - no race condition)
      await upsertState(stateData);
      
      // Assign image to state
      await assignImageToState(
        imageUrl,
        stateData.reactionType,
        stateData.sequenceOrder,
        stateData.description
      );
      
      // Invalidate cache to refresh all data
      invalidateCache();
      
      return imageUrl;
    } catch (error) {
      console.error("Upload failed:", error);
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      throw error;
    }
  };

  // Dynamic state helpers - find states by role/purpose
  const getStateByKey = (stateKey: string) => 
    states.find(s => s.state_key === stateKey);
  
  const getDefaultState = () => 
    states.find(s => s.display_order === 1)?.state_key || states[0]?.state_key || 'idle';
  
  const getTalkingState = () => 
    states.find(s => s.state_key === 'talk' || s.title.toLowerCase().includes('talk'))?.state_key;
  
  const getThinkingState = () => 
    states.find(s => s.state_key === 'research' || s.title.toLowerCase().includes('research') || s.title.toLowerCase().includes('think'))?.state_key;
  
  const getCompleteState = () => 
    states.find(s => s.state_key === 'complete' || s.title.toLowerCase().includes('complete') || s.title.toLowerCase().includes('done'))?.state_key;
  
  const getIdleState = () => 
    states.find(s => s.state_key === 'idle' || s.title.toLowerCase().includes('idle'))?.state_key;

  const updateStateSettings = async (
    stateId: string,
    updates: {
      animation_speed?: number;
      pause_duration?: number;
      loop_count?: number;
      chat_trigger?: string | null;
    }
  ) => {
    try {
      const { error } = await supabase
        .from('animation_states')
        .update(updates)
        .eq('id', stateId);
      
      if (error) throw error;
      
      invalidateCache();
    } catch (error) {
      console.error('Error updating state settings:', error);
      throw error;
    }
  };

  return {
    configs,
    states,
    uploadedImages,
    loading,
    getActiveImagesByState,
    uploadImage,
    uploadImageWithState,
    assignImageToState,
    updateAnimation,
    deleteAnimation,
    deleteUnassignedImage,
    deleteState,
    updateStateSettings,
    refetch: invalidateCache,
    getStateByKey,
    getDefaultState,
    getTalkingState,
    getThinkingState,
    getCompleteState,
    getIdleState,
  };
};
