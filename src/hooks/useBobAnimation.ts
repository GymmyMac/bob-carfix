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

  // Image URLs for conversational states
  const imageUrlsMap: Record<AnimationState, string> = {
    idle: "/bob-animations/idle.png",
    thinking: "/bob-animations/thinking.png",
    talking: "/bob-animations/talk-small.png",
    happy: "/bob-animations/happy.png",
    complete: "/bob-animations/23628891-3eb9-40bf-b2f5-dda69129038a.png"
  };

  // Preload all images
  useEffect(() => {
    const allImages = [
      ...Object.values(imageUrlsMap),
      "/bob-animations/Bob talk small.png",
      "/bob-animations/Bob thinking.png"
    ];
    allImages.forEach(url => {
      const img = new Image();
      img.src = url;
    });
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
    if (animationState === "talking") {
      return isTalkToggle ? "/bob-animations/Bob talk small.png" : "/bob-animations/talk-small.png";
    }
    
    if (animationState === "thinking") {
      return isThinkToggle ? "/bob-animations/Bob thinking.png" : "/bob-animations/thinking.png";
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
