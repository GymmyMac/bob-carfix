import { useState, useEffect, useRef } from "react";

export type AnimationState = "idle" | "listening" | "thinking" | "talking" | "happy" | "grump";

export const useBobAnimation = () => {
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const [isTalkToggle, setIsTalkToggle] = useState(false);
  const [talkSpeed, setTalkSpeed] = useState(400); // Dynamic talk speed
  const [imageUrls, setImageUrls] = useState<Record<AnimationState, string>>({
    idle: "",
    listening: "",
    thinking: "",
    talking: "",
    happy: "",
    grump: ""
  });
  
  const talkIntervalRef = useRef<NodeJS.Timeout>();

  // Load Bob images from public folder
  useEffect(() => {
    setImageUrls({
      idle: "/bob-animations/idle.png",
      listening: "/bob-animations/listening.png",
      thinking: "/bob-animations/thinking.png",
      talking: "/bob-animations/talk-small.png",
      happy: "/bob-animations/happy.png",
      grump: "/bob-animations/grump.png"
    });
  }, []);

  // Preload images
  useEffect(() => {
    Object.values(imageUrls).forEach(url => {
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [imageUrls]);

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
    return imageUrls[animationState] || imageUrls.idle;
  };

  return {
    animationState,
    setAnimationState,
    getCurrentImage,
    imageUrls,
    setTalkSpeed
  };
};
