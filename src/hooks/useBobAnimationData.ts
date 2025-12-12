import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BobAnimationConfig {
  id: string;
  animation_state: string;
  image_url: string;
  sequence_order: number;
  is_active: boolean;
  description: string | null;
  vertical_offset: number;
  look_id: string | null;
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
  idle_timeout_ms: number | null;
  look_id: string | null;
}

export interface BobLook {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BobAnimationData {
  states: AnimationStateDefinition[];
  configs: BobAnimationConfig[];
  uploadedImages: string[];
  looks: BobLook[];
  activeLookId: string | null;
}

/**
 * Centralized React Query hook for Bob's animation data.
 * Fetches once, caches for 30 seconds, deduplicates requests across components.
 * Includes realtime subscriptions for automatic updates.
 * @param lookId - Optional look ID to filter by. If not provided, returns data for active look.
 */
export const useBobAnimationData = (lookId?: string | null) => {
  const queryClient = useQueryClient();

  // Set up realtime subscriptions for automatic cache invalidation
  useEffect(() => {
    const statesChannel = supabase
      .channel('animation-states-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'animation_states'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['bob-animation-data'] });
      })
      .subscribe();

    const animationsChannel = supabase
      .channel('bob-animations-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bob_animations'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['bob-animation-data'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(statesChannel);
      supabase.removeChannel(animationsChannel);
    };
  }, [queryClient]);

  return useQuery<BobAnimationData>({
    queryKey: ['bob-animation-data', lookId],
    queryFn: async () => {
      // Fetch all looks
      const { data: looks, error: looksError } = await supabase
        .from("bob_looks")
        .select("*")
        .order("display_order");

      if (looksError) throw looksError;

      // Determine which look to use
      const activeLook = (looks || []).find((l: BobLook) => l.is_active);
      const targetLookId = lookId || activeLook?.id || null;

      // Fetch animation states for the target look
      let statesQuery = supabase
        .from("animation_states")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (targetLookId) {
        statesQuery = statesQuery.eq("look_id", targetLookId);
      }

      const { data: states, error: statesError } = await statesQuery;
      if (statesError) throw statesError;

      // Fetch animation configurations for the target look
      let configsQuery = supabase
        .from("bob_animations")
        .select("*")
        .eq("is_active", true)
        .order("animation_state")
        .order("sequence_order");

      if (targetLookId) {
        configsQuery = configsQuery.eq("look_id", targetLookId);
      }

      const { data: configs, error: configsError } = await configsQuery;
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
        looks: (looks || []) as BobLook[],
        activeLookId: targetLookId,
      };
    },
    staleTime: 30 * 1000,      // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000,     // Keep in cache for 5 minutes
  });
};

/**
 * Hook to invalidate and refetch Bob animation data.
 * Use after mutations (upload, delete, update) to refresh cache.
 */
export const useInvalidateBobAnimationData = () => {
  const queryClient = useQueryClient();
  
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ['bob-animation-data'] });
    await queryClient.refetchQueries({ 
      queryKey: ['bob-animation-data'],
      type: 'all'
    });
  };
};
