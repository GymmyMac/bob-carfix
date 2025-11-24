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
  const [loading, setLoading] = useState(true);

  const fetchConfigs = async () => {
    const { data, error } = await supabase
      .from("bob_animations")
      .select("*")
      .order("animation_state")
      .order("sequence_order");

    if (error) {
      console.error("Error fetching animation configs:", error);
      return;
    }

    setConfigs((data || []) as BobAnimationConfig[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchConfigs();

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
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("bob-images")
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("bob-images").getPublicUrl(filePath);

    return data.publicUrl;
  };

  const assignImageToState = async (
    imageUrl: string,
    state: AnimationState,
    sequenceOrder: number = 1,
    description?: string
  ) => {
    const { error } = await supabase.from("bob_animations").insert({
      animation_state: state,
      image_url: imageUrl,
      sequence_order: sequenceOrder,
      description: description || null,
      is_active: true,
    });

    if (error) {
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
    const { error } = await supabase.from("bob_animations").delete().eq("id", id);

    if (error) {
      throw error;
    }
  };

  return {
    configs,
    loading,
    getActiveImagesByState,
    uploadImage,
    assignImageToState,
    updateAnimation,
    deleteAnimation,
    refetch: fetchConfigs,
  };
};
