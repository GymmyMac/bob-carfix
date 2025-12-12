import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useBobAnimationData } from "./useBobAnimationData";

export type AnimationState = string;

export const useBobAnimation = () => {
  const [animationState, setAnimationState] = useState<AnimationState>("");
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [talkSpeed, setTalkSpeed] = useState(400);
  const [manualMode, setManualMode] = useState(false);
  
  const animationIntervalRef = useRef<NodeJS.Timeout>();

  // Use centralized cached data
  const { data, isLoading } = useBobAnimationData();

  // Ref to store imageUrlsMap for animation effect without causing restarts
  const imageUrlsMapRef = useRef<Record<string, any>>({});

  // Derive state-specific data from cached results
  const { imageUrlsMap, alternateImages, offsetsMap, scalesMap, availableStates } = useMemo(() => {
    if (!data) {
      return { 
        imageUrlsMap: {}, 
        alternateImages: {}, 
        offsetsMap: {},
        scalesMap: {},
        availableStates: [] 
      };
    }

    const newImageMap: Record<string, any> = {};
    const newAlternates: Record<string, string[]> = {};
    const newOffsetsMap: Record<string, number[]> = {};
    const newScalesMap: Record<string, number[]> = {};
    const stateKeys = data.states.map(s => s.state_key);

    stateKeys.forEach((key) => {
      const stateConfigs = data.configs
        .filter((config) => config.animation_state === key);
      
      const stateImages = stateConfigs.map((config) => config.image_url);
      const stateOffsets = stateConfigs.map((config) => config.vertical_offset || 0);
      const stateScales = stateConfigs.map((config) => config.scale || 100);

      if (stateImages.length > 0) {
        const stateInfo = data.states.find(s => s.state_key === key);
        newImageMap[key] = {
          url: stateImages[0],
          animation_speed: stateInfo?.animation_speed || 400,
          pause_duration: stateInfo?.pause_duration || 0,
          loop_count: stateInfo?.loop_count || 0,
        };
        newAlternates[key] = stateImages;
        newOffsetsMap[key] = stateOffsets;
        newScalesMap[key] = stateScales;
      }
    });

    return {
      imageUrlsMap: newImageMap,
      alternateImages: newAlternates,
      offsetsMap: newOffsetsMap,
      scalesMap: newScalesMap,
      availableStates: stateKeys,
    };
  }, [data]);

  // Keep ref updated with latest imageUrlsMap
  useEffect(() => {
    imageUrlsMapRef.current = imageUrlsMap;
  }, [imageUrlsMap]);

  // Initialize animation state from database
  useEffect(() => {
    if (availableStates.length > 0 && !animationState) {
      setAnimationState(availableStates[0]);
    }
  }, [availableStates, animationState]);

  // Enhanced sequence animation for ALL states with multiple images
  // Supports loop_count, pause_duration, and per-state animation_speed
  useEffect(() => {
    const alternates = alternateImages[animationState];
    
    // Clear any existing interval
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
    }
    
    // If state has multiple images, cycle through them
    if (alternates && alternates.length > 1) {
      setSequenceIndex(0); // Reset to first frame on state change
      
      // Get state-specific settings from ref (avoids dependency on imageUrlsMap)
      const stateInfo = imageUrlsMapRef.current[animationState] as any;
      
      const speed = stateInfo?.animation_speed || talkSpeed || 400;
      const loopCount = stateInfo?.loop_count || 0; // 0 = infinite
      const pauseDuration = stateInfo?.pause_duration || 0;
      
      let currentLoop = 0;
      let isPaused = false;
      
      const animate = () => {
        animationIntervalRef.current = setInterval(() => {
          if (isPaused) return;
          
          setSequenceIndex(prev => {
            const nextIndex = (prev + 1) % alternates.length;
            
            // Check if we completed a loop
            if (nextIndex === 0) {
              currentLoop++;
              
              // Stop if we've reached loop limit
              if (loopCount > 0 && currentLoop >= loopCount) {
                clearInterval(animationIntervalRef.current!);
                
                // Pause before restarting
                if (pauseDuration > 0) {
                  isPaused = true;
                  setTimeout(() => {
                    currentLoop = 0; // Reset
                    isPaused = false;
                    animate(); // Restart
                  }, pauseDuration);
                }
                
                return prev; // Hold on last frame
              }
            }
            
            return nextIndex;
          });
        }, speed);
      };
      
      animate();
    } else {
      // Single image or no images - no animation needed
      setSequenceIndex(0);
    }
    
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationState, alternateImages]); // Removed imageUrlsMap - use ref instead

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

  const getCurrentOffset = () => {
    const offsets = offsetsMap[animationState];
    
    if (!offsets || offsets.length === 0) {
      // Fallback to first available state with offsets
      const fallbackState = availableStates.find((s) => offsetsMap[s]?.length > 0);
      if (fallbackState) {
        return offsetsMap[fallbackState][0];
      }
      return 0;
    }
    
    // Return current frame's offset in sequence
    return offsets[sequenceIndex] || offsets[0];
  };

  const getCurrentScale = () => {
    const scales = scalesMap[animationState];
    
    if (!scales || scales.length === 0) {
      // Fallback to first available state with scales
      const fallbackState = availableStates.find((s) => scalesMap[s]?.length > 0);
      if (fallbackState) {
        return scalesMap[fallbackState][0];
      }
      return 100;
    }
    
    // Return current frame's scale in sequence
    return scales[sequenceIndex] || scales[0];
  };

  return {
    animationState,
    setAnimationState,
    getCurrentImage,
    getCurrentOffset,
    getCurrentScale,
    imageUrls: imageUrlsMap,
    availableStates,
    setTalkSpeed,
    manualMode,
    setManualMode,
  };
};
