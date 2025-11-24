import { useState, useEffect, useRef } from "react";

export type AnimationState = string;

export const useBobAnimation = () => {
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const [isTalkToggle, setIsTalkToggle] = useState(false);
  const [isThinkToggle, setIsThinkToggle] = useState(false);
  const [talkSpeed, setTalkSpeed] = useState(400);
  const [manualMode, setManualMode] = useState(false);
  
  const talkIntervalRef = useRef<NodeJS.Timeout>();
  const thinkIntervalRef = useRef<NodeJS.Timeout>();

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

  // Handle talking animation toggle
  useEffect(() => {
    if (animationState === "talking") {
      if (talkIntervalRef.current) {
        clearInterval(talkIntervalRef.current);
      }
      talkIntervalRef.current = setInterval(() => {
        setIsTalkToggle(prev => !prev);
      }, talkSpeed);
    } else {
      if (talkIntervalRef.current) {
        clearInterval(talkIntervalRef.current);
      }
      setIsTalkToggle(false);
    }
    
    return () => {
      if (talkIntervalRef.current) {
        clearInterval(talkIntervalRef.current);
      }
    };
  }, [animationState, talkSpeed]);

  // Handle thinking animation toggle
  useEffect(() => {
    if (animationState === "thinking") {
      if (thinkIntervalRef.current) {
        clearInterval(thinkIntervalRef.current);
      }
      thinkIntervalRef.current = setInterval(() => {
        setIsThinkToggle(prev => !prev);
      }, 600);
    } else {
      if (thinkIntervalRef.current) {
        clearInterval(thinkIntervalRef.current);
      }
      setIsThinkToggle(false);
    }
    
    return () => {
      if (thinkIntervalRef.current) {
        clearInterval(thinkIntervalRef.current);
      }
    };
  }, [animationState]);

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

    if (animationState === "talking" && alternates.length > 1) {
      return isTalkToggle ? alternates[1] : alternates[0];
    }
    
    if (animationState === "thinking" && alternates.length > 1) {
      return isThinkToggle ? alternates[1] : alternates[0];
    }
    
    return alternates[0];
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
