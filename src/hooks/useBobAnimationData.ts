/**
 * useBobAnimationData - Demo App Version
 * Uses the main app's Supabase client directly (not from BobProvider context)
 * This allows the demo app to work without wrapping in BobProvider
 */
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
  scale: number;
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
 * Demo app version of useBobAnimationData
 * Uses the main Supabase client directly
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
      const targetLookId = lookId || activeLook?.id || (looks && looks[0]?.id) || null;

      // If no looks exist, return empty data
      if (!targetLookId) {
        return {
          states: [],
          configs: [],
          uploadedImages: [],
          looks: (looks || []) as BobLook[],
          activeLookId: null,
        };
      }

      // Fetch animation states for the target look
      const { data: states, error: statesError } = await supabase
        .from("animation_states")
        .select("*")
        .eq("is_active", true)
        .eq("look_id", targetLookId)
        .order("display_order");
      if (statesError) throw statesError;

      // Fetch animation configurations for the target look
      const { data: configs, error: configsError } = await supabase
        .from("bob_animations")
        .select("*")
        .eq("is_active", true)
        .eq("look_id", targetLookId)
        .order("animation_state")
        .order("sequence_order");

      if (configsError) throw configsError;

      // Filter configs to only include those with valid state keys
      const validStateKeys = new Set((states || []).map((s: AnimationStateDefinition) => s.state_key));
      const filteredConfigs = (configs || []).filter((c: BobAnimationConfig) => validStateKeys.has(c.animation_state));

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
      filteredConfigs.forEach((config: BobAnimationConfig) => {
        const img = new Image();
        img.src = config.image_url;
      });

      return {
        states: (states || []) as AnimationStateDefinition[],
        configs: filteredConfigs as BobAnimationConfig[],
        uploadedImages,
        looks: (looks || []) as BobLook[],
        activeLookId: targetLookId,
      };
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to invalidate and refetch Bob animation data
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
