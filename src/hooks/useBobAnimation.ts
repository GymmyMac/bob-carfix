/**
 * useBobAnimation - Demo App Version
 * Uses the local useBobAnimationData (which uses main app's Supabase client)
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useBobAnimationData } from "./useBobAnimationData";

export type AnimationState = string;

interface UseBobAnimationOptions {
  isSpeaking?: boolean;
}

/**
 * Bob Animation Hook - v3.0 requestAnimationFrame Implementation
 * Demo app version using main Supabase client
 */
export const useBobAnimation = (options: UseBobAnimationOptions = {}) => {
  const { isSpeaking = false } = options;
  
  const [animationState, setAnimationStateInternal] = useState<AnimationState>("");
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [talkSpeed, setTalkSpeed] = useState(400);
  const [manualMode, setManualMode] = useState(false);
  
  // RAF references - single animation frame ID
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  
  // Mutable refs for animation state (avoids effect restarts)
  const isSpeakingRef = useRef(isSpeaking);
  const sequenceIndexRef = useRef(0);
  const currentLoopRef = useRef(0);
  const isPausedRef = useRef(false);
  const pauseStartRef = useRef(0);

  // Use the local version that uses main Supabase client
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

  // Keep refs updated
  useEffect(() => {
    imageUrlsMapRef.current = imageUrlsMap;
  }, [imageUrlsMap]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Debounced state setter to prevent rapid state changes
  const setAnimationState = useCallback((newState: AnimationState) => {
    setAnimationStateInternal(prev => {
      if (prev === newState) return prev;
      // Reset animation state when changing
      sequenceIndexRef.current = 0;
      currentLoopRef.current = 0;
      isPausedRef.current = false;
      setSequenceIndex(0);
      return newState;
    });
  }, []);

  // Initialize animation state from database
  useEffect(() => {
    if (availableStates.length > 0 && !animationState) {
      console.log('[useBobAnimation] Initializing to first available state:', availableStates[0]);
      setAnimationStateInternal(availableStates[0]);
    }
  }, [availableStates, animationState]);

  // requestAnimationFrame animation loop
  useEffect(() => {
    const alternates = alternateImages[animationState];
    
    // Cancel any existing animation
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    // Reset animation state
    sequenceIndexRef.current = 0;
    currentLoopRef.current = 0;
    isPausedRef.current = false;
    lastFrameTimeRef.current = 0;
    setSequenceIndex(0);
    
    // If no alternates or single image, nothing to animate
    if (!alternates || alternates.length <= 1) {
      return;
    }
    
    const stateInfo = imageUrlsMapRef.current[animationState] as any;
    const speed = stateInfo?.animation_speed || talkSpeed || 400;
    const loopCount = stateInfo?.loop_count || 0;
    const pauseDuration = stateInfo?.pause_duration || 0;
    const isTalkState = animationState.toLowerCase().includes('talk');
    
    // RAF animation loop
    const animate = (timestamp: number) => {
      // Initialize timing on first frame
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = timestamp;
      }
      
      // Handle pause state
      if (isPausedRef.current) {
        const pauseElapsed = timestamp - pauseStartRef.current;
        if (pauseElapsed >= pauseDuration) {
          // Resume animation
          isPausedRef.current = false;
          currentLoopRef.current = 0;
          lastFrameTimeRef.current = timestamp;
        }
        rafIdRef.current = requestAnimationFrame(animate);
        return;
      }
      
      const elapsed = timestamp - lastFrameTimeRef.current;
      
      // Check if enough time has passed for next frame
      if (elapsed >= speed) {
        lastFrameTimeRef.current = timestamp;
        
        // Calculate next frame
        const nextIndex = (sequenceIndexRef.current + 1) % alternates.length;
        
        // Check for loop completion
        if (nextIndex === 0) {
          currentLoopRef.current++;
          
          // If speaking and in talk state, keep looping indefinitely
          if (isTalkState && isSpeakingRef.current) {
            sequenceIndexRef.current = nextIndex;
            setSequenceIndex(nextIndex);
          } else if (loopCount > 0 && currentLoopRef.current >= loopCount) {
            // Loop count reached - pause or stop
            if (pauseDuration > 0) {
              isPausedRef.current = true;
              pauseStartRef.current = timestamp;
            }
            // Don't update index - stay on last frame
          } else {
            // Continue looping
            sequenceIndexRef.current = nextIndex;
            setSequenceIndex(nextIndex);
          }
        } else {
          // Normal frame advance
          sequenceIndexRef.current = nextIndex;
          setSequenceIndex(nextIndex);
        }
      }
      
      // Continue animation loop
      rafIdRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    rafIdRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [animationState, alternateImages, talkSpeed]);

  const getCurrentImage = useCallback(() => {
    const alternates = alternateImages[animationState];
    
    if (!alternates || alternates.length === 0) {
      // Find ANY state with valid images as fallback
      const fallbackState = availableStates.find((s) => alternateImages[s]?.length > 0);
      if (fallbackState) {
        console.warn(`[useBobAnimation] No images for "${animationState}", using fallback: ${fallbackState}`);
        return alternateImages[fallbackState][0];
      }
      console.error('[useBobAnimation] No valid images found for any state!');
      return "";
    }
    
    return alternates[sequenceIndex] || alternates[0];
  }, [alternateImages, animationState, availableStates, sequenceIndex]);

  const getCurrentOffset = useCallback(() => {
    const offsets = offsetsMap[animationState];
    
    if (!offsets || offsets.length === 0) {
      const fallbackState = availableStates.find((s) => offsetsMap[s]?.length > 0);
      if (fallbackState) {
        return offsetsMap[fallbackState][0];
      }
      return 0;
    }
    
    return offsets[sequenceIndex] || offsets[0];
  }, [offsetsMap, animationState, availableStates, sequenceIndex]);

  const getCurrentScale = useCallback(() => {
    const scales = scalesMap[animationState];
    
    if (!scales || scales.length === 0) {
      const fallbackState = availableStates.find((s) => scalesMap[s]?.length > 0);
      if (fallbackState) {
        return scalesMap[fallbackState][0];
      }
      return 100;
    }
    
    return scales[sequenceIndex] || scales[0];
  }, [scalesMap, animationState, availableStates, sequenceIndex]);

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
    isLoading,
  };
};
