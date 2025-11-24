import { useState, useEffect, useRef } from "react";

export type AnimationState = string;

export const useBobAnimation = () => {
  const [animationState, setAnimationState] = useState<AnimationState>("");
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [talkSpeed, setTalkSpeed] = useState(400);
  const [manualMode, setManualMode] = useState(false);
  
  const animationIntervalRef = useRef<NodeJS.Timeout>();

  // Fetch image URLs from database configuration
  const [imageUrlsMap, setImageUrlsMap] = useState<Record<string, string>>({});
  const [alternateImages, setAlternateImages] = useState<Record<string, string[]>>({});
  const [availableStates, setAvailableStates] = useState<string[]>([]);

  // Fetch and preload images from database
  useEffect(() => {
    const fetchImages = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Fetch active states
      const { data: statesData } = await supabase
        .from("animation_states")
        .select("state_key")
        .eq("is_active", true)
        .order("display_order");

      const stateKeys = statesData?.map((s) => s.state_key) || [];
      setAvailableStates(stateKeys);

      // Fetch image assignments
      const { data } = await supabase
        .from("bob_animations")
        .select("*")
        .eq("is_active", true)
        .order("animation_state")
        .order("sequence_order");

      if (data && data.length > 0) {
        const newImageMap: Record<string, string> = {};
        const newAlternates: Record<string, string[]> = {};

        stateKeys.forEach((key) => {
          const stateImages = data
            .filter((config) => config.animation_state === key)
            .map((config) => config.image_url);

          if (stateImages.length > 0) {
            newImageMap[key] = stateImages[0];
            newAlternates[key] = stateImages;
          }
        });

        setImageUrlsMap(newImageMap);
        setAlternateImages(newAlternates);

        // Preload all images
        const allImageUrls = data.map((d) => d.image_url);
        allImageUrls.forEach((url) => {
          const img = new Image();
          img.src = url;
        });
      }
    };

    fetchImages();
  }, []);

  // Initialize animation state from database
  useEffect(() => {
    if (availableStates.length > 0 && !animationState) {
      setAnimationState(availableStates[0]);
    }
  }, [availableStates, animationState]);

  // Generic sequence animation for ALL states with multiple images
  useEffect(() => {
    const alternates = alternateImages[animationState];
    
    // Clear any existing interval
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
    }
    
    // If state has multiple images, cycle through them
    if (alternates && alternates.length > 1) {
      setSequenceIndex(0); // Reset to first frame on state change
      
      // Cycle through all images in sequence
      animationIntervalRef.current = setInterval(() => {
        setSequenceIndex(prev => (prev + 1) % alternates.length);
      }, talkSpeed);
    } else {
      // Single image or no images - no animation needed
      setSequenceIndex(0);
    }
    
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, [animationState, alternateImages, talkSpeed]);

  const getCurrentImage = () => {
    const alternates = alternateImages[animationState];
    
    if (!alternates || alternates.length === 0) {
      // Fallback to first available state with images
      const fallbackState = availableStates.find((s) => alternateImages[s]?.length > 0);
      if (fallbackState) {
        return alternateImages[fallbackState][0];
      }
      return "";
    }
    
    // Return current frame in sequence (works for ALL states)
    return alternates[sequenceIndex] || alternates[0];
  };

  return {
    animationState,
    setAnimationState,
    getCurrentImage,
    imageUrls: imageUrlsMap,
    availableStates,
    setTalkSpeed,
    manualMode,
    setManualMode,
  };
};
