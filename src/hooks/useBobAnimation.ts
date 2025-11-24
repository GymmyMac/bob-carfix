import { useState, useEffect, useRef } from "react";

export type AnimationState = "idle" | "listening" | "thinking" | "talking" | "happy" | "grump";
export type IdleSequence = "normal" | "blink" | "headTurn" | "earScratch" | "catalogue";

export const useBobAnimation = () => {
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const [isTalkToggle, setIsTalkToggle] = useState(false);
  const [talkSpeed, setTalkSpeed] = useState(400); // Dynamic talk speed
  const [idleSequence, setIdleSequence] = useState<IdleSequence>("normal");
  const [idleFrameIndex, setIdleFrameIndex] = useState(0);
  
  const talkIntervalRef = useRef<NodeJS.Timeout>();
  const idleSequenceIntervalRef = useRef<NodeJS.Timeout>();
  const idleDelayTimeoutRef = useRef<NodeJS.Timeout>();

  // Define Bob images from public folder directly (no state needed)
  const imageUrlsMap: Record<AnimationState, string> = {
    idle: "/bob-animations/idle.png",
    listening: "/bob-animations/listening.png",
    thinking: "/bob-animations/thinking.png",
    talking: "/bob-animations/talk-small.png",
    happy: "/bob-animations/happy.png",
    grump: "/bob-animations/grump.png"
  };

  // Idle sequence frame definitions
  const idleSequenceFrames = {
    blink: [
      "/bob-animations/idle-blink-closing.png",
      "/bob-animations/idle-blink-closed.png",
      "/bob-animations/idle-blink-opening.png",
      "/bob-animations/idle.png"
    ],
    headTurn: [
      "/bob-animations/idle-head-slight-left.png",
      "/bob-animations/idle-head-left.png",
      "/bob-animations/idle-head-center.png",
      "/bob-animations/idle-head-slight-right.png",
      "/bob-animations/idle-head-right.png",
      "/bob-animations/idle-head-return.png",
      "/bob-animations/idle.png"
    ],
    earScratch: [
      "/bob-animations/idle-ear-scratch-1.png",
      "/bob-animations/idle-ear-scratch-2.png",
      "/bob-animations/idle-ear-scratch-3.png",
      "/bob-animations/idle-ear-scratch-4.png",
      "/bob-animations/idle.png"
    ],
    catalogue: [
      "/bob-animations/idle-catalogue.png"
    ],
    normal: ["/bob-animations/idle.png"]
  };

  // Timing for each sequence (milliseconds per frame)
  const sequenceTiming = {
    blink: 120,
    headTurn: 400,
    earScratch: 800,
    catalogue: 4000,
    normal: 3000
  };

  // Preload all images (core states + idle sequences)
  useEffect(() => {
    const allImages = [
      ...Object.values(imageUrlsMap),
      ...Object.values(idleSequenceFrames).flat()
    ];
    allImages.forEach(url => {
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

  // Handle idle sequence animations
  useEffect(() => {
    // Only run idle sequences when in idle state
    if (animationState !== "idle") {
      // Clear any running sequences
      if (idleSequenceIntervalRef.current) {
        clearInterval(idleSequenceIntervalRef.current);
      }
      if (idleDelayTimeoutRef.current) {
        clearTimeout(idleDelayTimeoutRef.current);
      }
      setIdleSequence("normal");
      setIdleFrameIndex(0);
      return;
    }

    // Start with normal idle, then begin random sequences after delay
    const startIdleSequences = () => {
      const sequences: IdleSequence[] = ["blink", "headTurn", "earScratch", "catalogue"];
      
      const playSequence = (sequence: IdleSequence) => {
        setIdleSequence(sequence);
        setIdleFrameIndex(0);
        
        const frames = idleSequenceFrames[sequence];
        const timing = sequenceTiming[sequence];
        let currentFrame = 0;

        idleSequenceIntervalRef.current = setInterval(() => {
          currentFrame++;
          if (currentFrame >= frames.length) {
            // Sequence complete, return to normal
            if (idleSequenceIntervalRef.current) {
              clearInterval(idleSequenceIntervalRef.current);
            }
            setIdleSequence("normal");
            setIdleFrameIndex(0);
            
            // Wait 3-5 seconds before next sequence
            const delay = 3000 + Math.random() * 2000;
            idleDelayTimeoutRef.current = setTimeout(() => {
              const nextSequence = sequences[Math.floor(Math.random() * sequences.length)];
              playSequence(nextSequence);
            }, delay);
          } else {
            setIdleFrameIndex(currentFrame);
          }
        }, timing);
      };

      // Initial delay before first sequence (2-3 seconds)
      idleDelayTimeoutRef.current = setTimeout(() => {
        const firstSequence = sequences[Math.floor(Math.random() * sequences.length)];
        playSequence(firstSequence);
      }, 2000 + Math.random() * 1000);
    };

    startIdleSequences();

    return () => {
      if (idleSequenceIntervalRef.current) {
        clearInterval(idleSequenceIntervalRef.current);
      }
      if (idleDelayTimeoutRef.current) {
        clearTimeout(idleDelayTimeoutRef.current);
      }
    };
  }, [animationState]);

  const getCurrentImage = () => {
    if (animationState === "talking") {
      return isTalkToggle ? "/bob-animations/talk-big.png" : "/bob-animations/talk-small.png";
    }
    
    if (animationState === "idle") {
      const frames = idleSequenceFrames[idleSequence];
      return frames[idleFrameIndex] || frames[0];
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
