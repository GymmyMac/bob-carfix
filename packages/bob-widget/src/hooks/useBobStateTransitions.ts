import { useState, useEffect, useCallback, useRef } from "react";
import type { AnimationStateDefinition } from "./useBobAnimationData";

type ChatStage = 
  | 'page_load' 
  | 'awaiting_input'
  | 'idle'
  | 'processing_input' 
  | 'streaming_response' 
  | 'response_complete'
  | 'showing_product';

interface UseBobStateTransitionsProps {
  states: AnimationStateDefinition[];
  setAnimationState: (state: string) => void;
  manualMode: boolean;
}

const IDLE_TIMEOUT_MS = 60000;

export const useBobStateTransitions = ({
  states,
  setAnimationState,
  manualMode
}: UseBobStateTransitionsProps) => {
  const [chatStage, setChatStage] = useState<ChatStage>('page_load');
  const [isInitialized, setIsInitialized] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getStateForTrigger = useCallback((trigger: string) => {
    return states.find(s => s.chat_trigger === trigger && s.is_active);
  }, [states]);

  const getListenState = useCallback(() => {
    return states.find(s => 
      s.chat_trigger === 'awaiting_input' || 
      s.state_key === 'talk_pause' || 
      s.title.toLowerCase().includes('listen') ||
      s.title.toLowerCase().includes('pause')
    );
  }, [states]);

  const getIdleState = useCallback(() => {
    return states.find(s => 
      s.state_key === 'idle' || 
      s.title.toLowerCase().includes('idle')
    );
  }, [states]);

  const getStateSettings = useCallback((stateKey: string) => {
    const state = states.find(s => s.state_key === stateKey);
    return {
      speed: state?.animation_speed || 400,
      pauseDuration: state?.pause_duration || 0,
      loopCount: state?.loop_count || 0
    };
  }, [states]);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

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

  const transitionTo = useCallback((trigger: string) => {
    if (manualMode) return;
    
    const state = getStateForTrigger(trigger);
    if (state) {
      setAnimationState(state.state_key);
    }
  }, [manualMode, getStateForTrigger, setAnimationState]);

  const transitionToListen = useCallback(() => {
    if (manualMode) return;
    
    const listenState = getListenState();
    if (listenState) {
      setChatStage('awaiting_input');
      setAnimationState(listenState.state_key);
      startIdleTimer();
    }
  }, [manualMode, getListenState, setAnimationState, startIdleTimer]);

  const initialize = useCallback(() => {
    if (isInitialized || manualMode) return;
    
    setIsInitialized(true);
    setChatStage('page_load');
    transitionTo('page_load');

    setTimeout(() => {
      transitionToListen();
    }, 3000);
  }, [isInitialized, manualMode, transitionTo, transitionToListen]);

  const onUserInput = useCallback(() => {
    clearIdleTimer();
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

    setTimeout(() => {
      transitionToListen();
    }, 3000);
  }, [transitionTo, transitionToListen]);

  const onShowingProduct = useCallback(() => {
    setChatStage('showing_product');
    
    const showingState = states.find(s => 
      s.chat_trigger === 'showing_product' || 
      s.state_key === 'showing_product'
    );
    
    if (showingState) {
      setAnimationState(showingState.state_key);
    }

    setTimeout(() => {
      transitionToListen();
    }, 4000);
  }, [states, setAnimationState, transitionToListen]);

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
