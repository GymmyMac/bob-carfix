import { useState, useEffect, useCallback, useRef } from "react";
import { AnimationStateDefinition } from "./useBobAnimationConfig";

type ChatStage = 
  | 'page_load' 
  | 'awaiting_input'    // "Listen" state - actively waiting for user input
  | 'idle'              // True idle after timeout - relaxed/bored
  | 'processing_input' 
  | 'streaming_response' 
  | 'response_complete'
  | 'showing_product';  // Bob is presenting product recommendations

interface UseBobStateTransitionsProps {
  states: AnimationStateDefinition[];
  setAnimationState: (state: string) => void;
  manualMode: boolean;
}

const IDLE_TIMEOUT_MS = 60000; // 60 seconds before transitioning to idle

export const useBobStateTransitions = ({
  states,
  setAnimationState,
  manualMode
}: UseBobStateTransitionsProps) => {
  const [chatStage, setChatStage] = useState<ChatStage>('page_load');
  const [isInitialized, setIsInitialized] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Find state by chat trigger
  const getStateForTrigger = useCallback((trigger: string) => {
    return states.find(s => s.chat_trigger === trigger && s.is_active);
  }, [states]);

  // Find listen state (awaiting_input trigger or talk_pause)
  const getListenState = useCallback(() => {
    return states.find(s => 
      s.chat_trigger === 'awaiting_input' || 
      s.state_key === 'talk_pause' || 
      s.title.toLowerCase().includes('listen') ||
      s.title.toLowerCase().includes('pause')
    );
  }, [states]);

  // Find true idle state
  const getIdleState = useCallback(() => {
    return states.find(s => 
      s.state_key === 'idle' || 
      s.title.toLowerCase().includes('idle')
    );
  }, [states]);

  // Get state settings with defaults
  const getStateSettings = useCallback((stateKey: string) => {
    const state = states.find(s => s.state_key === stateKey);
    return {
      speed: state?.animation_speed || 400,
      pauseDuration: state?.pause_duration || 0,
      loopCount: state?.loop_count || 0
    };
  }, [states]);

  // Clear idle timer
  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  // Start idle timer - transitions to true idle after 60 seconds
  const startIdleTimer = useCallback(() => {
    clearIdleTimer();
    
    if (manualMode) return;

    idleTimerRef.current = setTimeout(() => {
      const idleState = getIdleState();
      if (idleState) {
        setChatStage('idle');
        setAnimationState(idleState.state_key);
      }
    }, IDLE_TIMEOUT_MS);
  }, [manualMode, getIdleState, setAnimationState, clearIdleTimer]);

  // Trigger state transition
  const transitionTo = useCallback((trigger: string) => {
    if (manualMode) return;
    
    const state = getStateForTrigger(trigger);
    if (state) {
      setAnimationState(state.state_key);
    }
  }, [manualMode, getStateForTrigger, setAnimationState]);

  // Transition to listen state
  const transitionToListen = useCallback(() => {
    if (manualMode) return;
    
    const listenState = getListenState();
    if (listenState) {
      setChatStage('awaiting_input');
      setAnimationState(listenState.state_key);
      startIdleTimer();
    }
  }, [manualMode, getListenState, setAnimationState, startIdleTimer]);

  // Initialize page load sequence
  const initialize = useCallback(() => {
    if (isInitialized || manualMode) return;
    
    setIsInitialized(true);
    setChatStage('page_load');
    transitionTo('page_load');

    // After greeting animation, transition to listen state (not idle)
    setTimeout(() => {
      transitionToListen();
    }, 3000);
  }, [isInitialized, manualMode, transitionTo, transitionToListen]);

  // Chat event handlers
  const onUserInput = useCallback(() => {
    clearIdleTimer(); // Reset idle timer on user interaction
    setChatStage('processing_input');
    transitionTo('processing_input');
  }, [transitionTo, clearIdleTimer]);

  const onStreamStart = useCallback(() => {
    clearIdleTimer();
    setChatStage('streaming_response');
    transitionTo('streaming_response');
  }, [transitionTo, clearIdleTimer]);

  const onStreamComplete = useCallback(() => {
    setChatStage('response_complete');
    transitionTo('response_complete');

    // Return to listen state after completion animation (not idle)
    setTimeout(() => {
      transitionToListen();
    }, 3000);
  }, [transitionTo, transitionToListen]);

  // Showing product state - when Bob recommends parts
  const onShowingProduct = useCallback(() => {
    setChatStage('showing_product');
    
    // Look for state with showing_product trigger, or fallback to state_key match
    const showingState = states.find(s => 
      s.chat_trigger === 'showing_product' || 
      s.state_key === 'showing_product'
    );
    
    if (showingState) {
      setAnimationState(showingState.state_key);
    }

    // Return to listen state after showing product animation
    setTimeout(() => {
      transitionToListen();
    }, 4000); // Slightly longer to show off the product
  }, [states, setAnimationState, transitionToListen]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearIdleTimer();
  }, [clearIdleTimer]);

  return {
    chatStage,
    initialize,
    onUserInput,
    onStreamStart,
    onStreamComplete,
    onShowingProduct,
    getStateSettings
  };
};
