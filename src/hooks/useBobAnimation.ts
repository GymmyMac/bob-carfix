import { useState, useEffect, useRef } from "react";

export type AnimationState = "idle" | "listening" | "thinking" | "talking" | "happy" | "grump";

export const useBobAnimation = () => {
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const [isTalkToggle, setIsTalkToggle] = useState(false);
  const [talkSpeed, setTalkSpeed] = useState(400); // Dynamic talk speed
  
  const talkIntervalRef = useRef<NodeJS.Timeout>();

  // Define Bob images from public folder directly (no state needed)
  const imageUrlsMap: Record<AnimationState, string> = {
    idle: "/bob-animations/idle.png",
    listening: "/bob-animations/listening.png",
    thinking: "/bob-animations/thinking.png",
    talking: "/bob-animations/talk-small.png",
    happy: "/bob-animations/happy.png",
    grump: "/bob-animations/grump.png"
  };

  // Preload images
  useEffect(() => {
    Object.values(imageUrlsMap).forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  // Handle talking animation toggle with dynamic speed
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

  const getCurrentImage = () => {
    if (animationState === "talking") {
      return isTalkToggle ? "/bob-animations/talk-big.png" : "/bob-animations/talk-small.png";
    }
    return imageUrlsMap[animationState] || imageUrlsMap.idle;
  };

  return {
    animationState,
    setAnimationState,
    getCurrentImage,
    imageUrls: imageUrlsMap,
    setTalkSpeed
  };
};
