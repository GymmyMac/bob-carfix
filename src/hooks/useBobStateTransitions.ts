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
    }, 3000);
  }, [isInitialized, manualMode, transitionTo]);

  // Chat event handlers
  const onUserInput = useCallback(() => {
    setChatStage('processing_input');
    transitionTo('processing_input');
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
    }, 3000);
  }, [transitionTo]);

  return {
    chatStage,
    initialize,
    onUserInput,
    onStreamStart,
    onStreamComplete,
    getStateSettings
  };
};
