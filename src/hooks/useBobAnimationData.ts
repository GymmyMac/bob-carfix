import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BobAnimationConfig {
  id: string;
  animation_state: string;
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
  animation_speed: number | null;
  pause_duration: number | null;
  loop_count: number | null;
  chat_trigger: string | null;
}

export interface BobAnimationData {
  states: AnimationStateDefinition[];
  configs: BobAnimationConfig[];
  uploadedImages: string[];
}

/**
 * Centralized React Query hook for Bob's animation data.
 * Fetches once, caches for 5 minutes, deduplicates requests across components.
 */
export const useBobAnimationData = () => {
  return useQuery<BobAnimationData>({
    queryKey: ['bob-animation-data'],
    queryFn: async () => {
      // Fetch animation states
      const { data: states, error: statesError } = await supabase
        .from("animation_states")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (statesError) throw statesError;

      // Fetch animation configurations
      const { data: configs, error: configsError } = await supabase
        .from("bob_animations")
        .select("*")
        .eq("is_active", true)
        .order("animation_state")
        .order("sequence_order");

      if (configsError) throw configsError;

      // List uploaded images from storage
      const { data: files, error: filesError } = await supabase.storage
        .from("bob-images")
        .list();

      if (filesError) throw filesError;

      const uploadedImages = (files || []).map((file) => {
        const { data: urlData } = supabase.storage
          .from("bob-images")
          .getPublicUrl(file.name);
        return urlData.publicUrl;
      });

      // Preload all animation images for smooth transitions
      configs?.forEach((config) => {
        const img = new Image();
        img.src = config.image_url;
      });

      return {
        states: (states || []) as AnimationStateDefinition[],
        configs: (configs || []) as BobAnimationConfig[],
        uploadedImages,
      };
    },
    staleTime: 5 * 60 * 1000,  // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000,    // Keep in cache for 10 minutes
  });
};

/**
 * Hook to invalidate and refetch Bob animation data.
 * Use after mutations (upload, delete, update) to refresh cache.
 */
export const useInvalidateBobAnimationData = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['bob-animation-data'] });
  };
};
