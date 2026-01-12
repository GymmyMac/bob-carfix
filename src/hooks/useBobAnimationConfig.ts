import { supabase } from "@/lib/backend/client";
import { 
  useBobAnimationData, 
  useInvalidateBobAnimationData,
  type BobAnimationConfig,
  type AnimationStateDefinition,
  type BobLook 
} from "./useBobAnimationData";

export type AnimationState = string;
export type { BobAnimationConfig, AnimationStateDefinition, BobLook };

export interface StateDefinition {
  reactionType: string;
  name: string;
  description?: string;
  displayOrder: number;
  sequenceOrder: number;
}

export const useBobAnimationConfig = (lookId?: string | null) => {
  // Use centralized cached data with optional look filtering
  const { data, isLoading } = useBobAnimationData(lookId);
  const invalidateCache = useInvalidateBobAnimationData();

  const configs = data?.configs || [];
  const states = data?.states || [];
  const uploadedImages = data?.uploadedImages || [];
  const looks = data?.looks || [];
  const activeLookId = data?.activeLookId || null;
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
    description?: string,
    targetLookId?: string | null,
    scale?: number
  ) => {
    try {
      const lookToUse = targetLookId || activeLookId;
      const { error } = await supabase.from("bob_animations").insert({
        animation_state: state,
        image_url: imageUrl,
        sequence_order: sequenceOrder,
        description: description || null,
        is_active: true,
        look_id: lookToUse,
        scale: scale ?? 100,
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
    
    // Invalidate cache to refresh data
    invalidateCache();
  };

  // Batch reorder function - single DB call for multiple updates
  const batchReorder = async (items: Array<{ id: string; sequence_order: number }>) => {
    try {
      // Use Promise.all with individual updates for now since upsert requires full row
      // But we batch them in a single transaction-like operation
      const updates = items.map(item => 
        supabase
          .from("bob_animations")
          .update({ sequence_order: item.sequence_order })
          .eq("id", item.id)
      );

      const results = await Promise.all(updates);
      
      // Check for any errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }

      // Single cache invalidation after all updates
      invalidateCache();
    } catch (error) {
      console.error("Batch reorder error:", error);
      throw error;
    }
  };

  // Batch update scale for all animations in the current look
  const batchUpdateScale = async (scale: number, targetLookId?: string | null) => {
    try {
      const lookToUse = targetLookId ?? activeLookId;
      
      // Filter configs for this look
      const targetConfigs = lookToUse 
        ? configs.filter(c => c.look_id === lookToUse)
        : configs;

      if (targetConfigs.length === 0) {
        return 0;
      }

      const updates = targetConfigs.map(config => 
        supabase
          .from("bob_animations")
          .update({ scale })
          .eq("id", config.id)
      );

      const results = await Promise.all(updates);
      
      // Check for any errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }

      // Single cache invalidation after all updates
      invalidateCache();
      
      return targetConfigs.length;
    } catch (error) {
      console.error("Batch scale update error:", error);
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

  const upsertState = async (stateData: StateDefinition, targetLookId?: string | null) => {
    const lookToUse = targetLookId || activeLookId;
    
    // Query database directly instead of using React state to avoid race conditions
    let query = supabase
      .from("animation_states")
      .select("*")
      .eq("state_key", stateData.reactionType);
    
    if (lookToUse) {
      query = query.eq("look_id", lookToUse);
    }
    
    const { data: existing, error: fetchError } = await query.maybeSingle();

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
          look_id: lookToUse,
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    }
  };

  const uploadImageWithState = async (file: File, stateData: StateDefinition, targetLookId?: string | null) => {
    try {
      const lookToUse = targetLookId || activeLookId;
      
      // Upload image first
      const imageUrl = await uploadImage(file);
      
      // Upsert state (now with direct DB query - no race condition)
      await upsertState(stateData, lookToUse);
      
      // Assign image to state
      await assignImageToState(
        imageUrl,
        stateData.reactionType,
        stateData.sequenceOrder,
        stateData.description,
        lookToUse
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
    states.find(s => 
      s.state_key === 'talk' || 
      s.state_key === 'talking' || 
      s.title.toLowerCase().includes('talk')
    )?.state_key;
  
  const getThinkingState = () => 
    states.find(s => 
      s.state_key === 'research' || 
      s.state_key === 'researching' || 
      s.title.toLowerCase().includes('research') || 
      s.title.toLowerCase().includes('think')
    )?.state_key;
  
  const getCompleteState = () => 
    states.find(s => 
      s.state_key === 'complete' || 
      s.state_key === 'showing_product' || 
      s.state_key === 'idle' ||  // Fallback to idle if no complete state
      s.title.toLowerCase().includes('complete') || 
      s.title.toLowerCase().includes('done')
    )?.state_key;
  
  const getIdleState = () => 
    states.find(s => 
      s.state_key === 'idle' || 
      s.title.toLowerCase().includes('idle')
    )?.state_key;
  
  const getListenState = () => 
    states.find(s => 
      s.chat_trigger === 'awaiting_input' || 
      s.state_key === 'talk_pause' || 
      s.state_key === 'listening' || 
      s.title.toLowerCase().includes('listen') || 
      s.title.toLowerCase().includes('pause')
    )?.state_key;

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

  const getIdleTimeoutSettings = () => {
    const idleState = states.find(s => 
      s.chat_trigger === 'awaiting_input' || 
      s.state_key === 'idle' || 
      s.title.toLowerCase().includes('idle')
    );
    
    return {
      enabled: idleState?.idle_timeout_ms != null && idleState.idle_timeout_ms > 0,
      timeoutMs: idleState?.idle_timeout_ms || 30000
    };
  };

  const updateIdleTimeout = async (timeoutMs: number | null) => {
    try {
      const idleState = states.find(s => 
        s.chat_trigger === 'awaiting_input' || 
        s.state_key === 'idle' || 
        s.title.toLowerCase().includes('idle')
      );
      
      if (!idleState) throw new Error('Idle state not found');
      
      const { error } = await supabase
        .from('animation_states')
        .update({ idle_timeout_ms: timeoutMs })
        .eq('id', idleState.id);
      
      if (error) throw error;
      
      invalidateCache();
    } catch (error) {
      console.error('Error updating idle timeout:', error);
      throw error;
    }
  };

  return {
    configs,
    states,
    uploadedImages,
    looks,
    activeLookId,
    loading,
    getActiveImagesByState,
    uploadImage,
    uploadImageWithState,
    assignImageToState,
    updateAnimation,
    batchReorder,
    batchUpdateScale,
    deleteAnimation,
    deleteUnassignedImage,
    deleteState,
    updateStateSettings,
    upsertState,
    refetch: invalidateCache,
    getStateByKey,
    getDefaultState,
    getTalkingState,
    getThinkingState,
    getCompleteState,
    getIdleState,
    getListenState,
    getIdleTimeoutSettings,
    updateIdleTimeout,
  };
};
