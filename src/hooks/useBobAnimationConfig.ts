import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AnimationState = string;

export interface BobAnimationConfig {
  id: string;
  animation_state: AnimationState;
  image_url: string;
  sequence_order: number;
  is_active: boolean;
  description: string | null;
}

export interface AnimationStateDefinition {
  id: string;
  state_key: string;
  title: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StateDefinition {
  reactionType: string;
  name: string;
  description?: string;
  displayOrder: number;
  sequenceOrder: number;
}

export const useBobAnimationConfig = () => {
  const [configs, setConfigs] = useState<BobAnimationConfig[]>([]);
  const [states, setStates] = useState<AnimationStateDefinition[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("bob_animations")
        .select("*")
        .order("animation_state")
        .order("sequence_order");

      if (error) throw error;

      setConfigs((data || []) as BobAnimationConfig[]);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching animation configs:", error);
      setLoading(false);
    }
  };

  const fetchStates = async () => {
    try {
      const { data, error } = await supabase
        .from("animation_states")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      setStates((data || []) as AnimationStateDefinition[]);
    } catch (error) {
      console.error("Error fetching states:", error);
    }
  };

  const listUploadedImages = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("bob-images")
        .list();

      if (error) throw error;

      const urls = (data || []).map((file) => {
        const { data: urlData } = supabase.storage
          .from("bob-images")
          .getPublicUrl(file.name);
        return urlData.publicUrl;
      });

      setUploadedImages(urls);
    } catch (error) {
      console.error("Error listing uploaded images:", error);
      setUploadedImages([]);
    }
  };

  useEffect(() => {
    fetchConfigs();
    fetchStates();
    listUploadedImages();

    // Subscribe to realtime updates for animations
    const animChannel = supabase
      .channel("bob_animations_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bob_animations",
        },
        () => {
          fetchConfigs();
        }
      )
      .subscribe();

    // Subscribe to realtime updates for states
    const stateChannel = supabase
      .channel("animation_states_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "animation_states",
        },
        () => {
          fetchStates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(animChannel);
      supabase.removeChannel(stateChannel);
    };
  }, []);

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

      // Refresh uploaded images list
      await listUploadedImages();

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

      // Refresh both configs and uploaded images
      await fetchConfigs();
      await listUploadedImages();
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

      // Refresh data
      await fetchConfigs();
      await listUploadedImages();
    } catch (error) {
      console.error("Error deleting animation:", error);
      throw error;
    }
  };

  const deleteUnassignedImage = async (imageUrl: string) => {
    try {
      await deleteImageFromStorage(imageUrl);
      await listUploadedImages();
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

      // Refresh data
      await fetchStates();
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
      
      // Refresh all data
      await fetchStates();
      await fetchConfigs();
      await listUploadedImages();
      
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
    refetch: fetchConfigs,
    refreshImages: listUploadedImages,
  };
};
