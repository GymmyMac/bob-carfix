import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnimationState } from "./useBobAnimation";

export interface BobAnimationConfig {
  id: string;
  animation_state: AnimationState;
  image_url: string;
  sequence_order: number;
  is_active: boolean;
  description: string | null;
}

export const useBobAnimationConfig = () => {
  const [configs, setConfigs] = useState<BobAnimationConfig[]>([]);
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
    listUploadedImages();

    // Subscribe to realtime updates
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
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

  return {
    configs,
    uploadedImages,
    loading,
    getActiveImagesByState,
    uploadImage,
    assignImageToState,
    updateAnimation,
    deleteAnimation,
    deleteUnassignedImage,
    refetch: fetchConfigs,
    refreshImages: listUploadedImages,
  };
};
