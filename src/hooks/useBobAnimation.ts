import { useState, useEffect, useRef } from "react";

export type AnimationState = "idle" | "thinking" | "talking" | "happy" | "complete";

export const useBobAnimation = () => {
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const [isTalkToggle, setIsTalkToggle] = useState(false);
  const [isThinkToggle, setIsThinkToggle] = useState(false);
  const [talkSpeed, setTalkSpeed] = useState(400);
  const [manualMode, setManualMode] = useState(false);
  
  const talkIntervalRef = useRef<NodeJS.Timeout>();
  const thinkIntervalRef = useRef<NodeJS.Timeout>();

  // Fetch image URLs from database configuration
  const [imageUrlsMap, setImageUrlsMap] = useState<Record<AnimationState, string>>({
    idle: "/bob-animations/idle.png",
    thinking: "/bob-animations/thinking.png",
    talking: "/bob-animations/talk-small.png",
    happy: "/bob-animations/happy.png",
    complete: "/bob-animations/23628891-3eb9-40bf-b2f5-dda69129038a.png"
  });

  const [alternateImages, setAlternateImages] = useState<Partial<Record<AnimationState, string[]>>>({});

  // Fetch and preload images from database
  useEffect(() => {
    const fetchImages = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("bob_animations")
        .select("*")
        .eq("is_active", true)
        .order("sequence_order");

      if (data && data.length > 0) {
        const newImageMap: Record<AnimationState, string> = {} as Record<AnimationState, string>;
        const newAlternates: Partial<Record<AnimationState, string[]>> = {};

        data.forEach((config) => {
          const state = config.animation_state as AnimationState;
          if (!newImageMap[state]) {
            newImageMap[state] = config.image_url;
          }
          if (!newAlternates[state]) {
            newAlternates[state] = [];
          }
          newAlternates[state]!.push(config.image_url);
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
    
    if (animationState === "talking" && alternates && alternates.length > 1) {
      return isTalkToggle ? alternates[1] : alternates[0];
    }
    
    if (animationState === "thinking" && alternates && alternates.length > 1) {
      return isThinkToggle ? alternates[1] : alternates[0];
    }
    
    return imageUrlsMap[animationState] || imageUrlsMap.idle;
  };

  return {
    animationState,
    setAnimationState,
    getCurrentImage,
    imageUrls: imageUrlsMap,
    setTalkSpeed,
    manualMode,
    setManualMode
  };
};
