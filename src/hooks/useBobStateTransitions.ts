import { useState, useEffect, useCallback } from "react";
import { AnimationStateDefinition } from "./useBobAnimationConfig";

type ChatStage = 
  | 'page_load' 
  | 'awaiting_input' 
  | 'processing_input' 
  | 'streaming_response' 
  | 'response_complete';

interface UseBobStateTransitionsProps {
  states: AnimationStateDefinition[];
  setAnimationState: (state: string) => void;
  setTalkSpeed: (speed: number) => void;
  manualMode: boolean;
}

export const useBobStateTransitions = ({
  states,
  setAnimationState,
  setTalkSpeed,
  manualMode
}: UseBobStateTransitionsProps) => {
  const [chatStage, setChatStage] = useState<ChatStage>('page_load');
  const [isInitialized, setIsInitialized] = useState(false);
  const [idleStartTime, setIdleStartTime] = useState<number | null>(null);

  // Find state by chat trigger
  const getStateForTrigger = useCallback((trigger: string) => {
    return states.find(s => s.chat_trigger === trigger && s.is_active);
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

  // Trigger state transition
  const transitionTo = useCallback((trigger: string) => {
    if (manualMode) return;
    
    const state = getStateForTrigger(trigger);
    if (state) {
      setAnimationState(state.state_key);
      setTalkSpeed(state.animation_speed || 400);
    }
  }, [manualMode, getStateForTrigger, setAnimationState, setTalkSpeed]);

  // Initialize page load sequence
  const initialize = useCallback(() => {
    if (isInitialized || manualMode) return;
    
    setIsInitialized(true);
    setChatStage('page_load');
    transitionTo('page_load');

    // After greeting animation, transition to awaiting input
    setTimeout(() => {
      setChatStage('awaiting_input');
      transitionTo('awaiting_input');
      setIdleStartTime(Date.now()); // Start idle timer after initial greeting
    }, 3000);
  }, [isInitialized, manualMode, transitionTo]);

  // Chat event handlers
  const onUserInput = useCallback(() => {
    setChatStage('processing_input');
    transitionTo('processing_input');
    setIdleStartTime(null); // Reset idle timer on user interaction
  }, [transitionTo]);

  const onStreamStart = useCallback(() => {
    setChatStage('streaming_response');
    transitionTo('streaming_response');
  }, [transitionTo]);

  const onStreamComplete = useCallback(() => {
    setChatStage('response_complete');
    transitionTo('response_complete');

    // Return to awaiting input after completion animation
    setTimeout(() => {
      setChatStage('awaiting_input');
      transitionTo('awaiting_input');
      setIdleStartTime(Date.now()); // Start idle timer
    }, 3000);
  }, [transitionTo]);

  // Idle timeout effect - loops back to welcome state
  useEffect(() => {
    if (chatStage !== 'awaiting_input' || manualMode || !idleStartTime) {
      return;
    }

    // Get idle timeout settings from state
    const idleState = states.find(s => 
      s.chat_trigger === 'awaiting_input' || 
      s.state_key === 'idle' || 
      s.title.toLowerCase().includes('idle')
    );
    
    const idleTimeoutMs = idleState?.idle_timeout_ms;
    
    // If no timeout configured or disabled, don't set timer
    if (!idleTimeoutMs || idleTimeoutMs <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      // Transition back to welcome state (page_load)
      transitionTo('page_load');
      
      // After wave animation completes, return to idle
      setTimeout(() => {
        setChatStage('awaiting_input');
        transitionTo('awaiting_input');
        setIdleStartTime(Date.now()); // Reset for next loop
      }, 3000);
    }, idleTimeoutMs);

    return () => clearTimeout(timer);
  }, [chatStage, manualMode, idleStartTime, states, transitionTo]);

  return {
    chatStage,
    initialize,
    onUserInput,
    onStreamStart,
    onStreamComplete,
    getStateSettings
  };
};
