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

  // ============================================================================
  // STATE LOOKUP HELPERS
  // ============================================================================

  const getStateForTrigger = useCallback((trigger: string) => {
    const state = states.find(s => s.chat_trigger === trigger && s.is_active);
    console.log(`[StateTransitions] Looking for trigger: "${trigger}" -> found:`, state?.state_key || 'none');
    return state;
  }, [states]);

  const getResearchState = useCallback(() => {
    return states.find(s => 
      s.chat_trigger === 'processing_input' || 
      s.state_key === 'research' ||
      s.state_key === 'researching' ||
      s.title.toLowerCase().includes('research') ||
      s.title.toLowerCase().includes('thinking')
    );
  }, [states]);

  const getTalkState = useCallback(() => {
    return states.find(s => 
      s.chat_trigger === 'streaming_response' || 
      s.state_key === 'talk' ||
      s.state_key === 'talking' ||
      s.title.toLowerCase().includes('talk')
    );
  }, [states]);

  const getListenState = useCallback(() => {
    return states.find(s => 
      s.chat_trigger === 'awaiting_input' || 
      s.state_key === 'talk_pause' || 
      s.state_key === 'listening' ||
      s.title.toLowerCase().includes('listen') ||
      s.title.toLowerCase().includes('pause')
    );
  }, [states]);

  const getCompleteState = useCallback(() => {
    // Try to find explicit complete state first
    const completeState = states.find(s => 
      s.chat_trigger === 'response_complete' || 
      s.state_key === 'complete' ||
      s.title.toLowerCase().includes('complete')
    );
    // Fallback to idle if no complete state exists
    if (!completeState) {
      return states.find(s => 
        s.state_key === 'idle' || 
        s.title.toLowerCase().includes('idle')
      );
    }
    return completeState;
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

  // ============================================================================
  // EXPLICIT STATE TRANSITION CALLBACKS
  // ============================================================================

  /**
   * Called when user sends a message - transition to RESEARCH state
   */
  const onUserInput = useCallback(() => {
    if (manualMode) return;
    clearIdleTimer();
    setChatStage('processing_input');
    
    const researchState = getResearchState();
    console.log('[StateTransitions] User input - switching to RESEARCH:', researchState?.state_key);
    
    if (researchState) {
      setAnimationState(researchState.state_key);
    } else {
      transitionTo('processing_input');
    }
  }, [manualMode, clearIdleTimer, getResearchState, setAnimationState, transitionTo]);

  /**
   * Called when TTS speech STARTS - transition to TALK state
   */
  const onSpeechStart = useCallback(() => {
    if (manualMode) return;
    clearIdleTimer();
    setChatStage('streaming_response');
    
    const talkState = getTalkState();
    console.log('[StateTransitions] Speech started - switching to TALK:', talkState?.state_key);
    
    if (talkState) {
      setAnimationState(talkState.state_key);
    }
  }, [manualMode, clearIdleTimer, getTalkState, setAnimationState]);

  /**
   * Called when TTS speech ENDS - transition to COMPLETE then LISTEN
   */
  const onSpeechEnd = useCallback(() => {
    if (manualMode) return;
    
    const completeState = getCompleteState();
    console.log('[StateTransitions] Speech ended - switching to COMPLETE:', completeState?.state_key);
    
    if (completeState) {
      setAnimationState(completeState.state_key);
    }
    
    // Transition to listen after brief pause
    setTimeout(() => {
      if (!manualMode) {
        transitionToListen();
      }
    }, 2000);
  }, [manualMode, getCompleteState, setAnimationState, transitionToListen]);

  const onStreamStart = useCallback(() => {
    clearIdleTimer();
    setChatStage('streaming_response');
    console.log('[StateTransitions] Stream started (API response)');
    // Note: Don't change animation here - wait for actual TTS to start
  }, [clearIdleTimer]);

  const onStreamComplete = useCallback(() => {
    setChatStage('response_complete');
    console.log('[StateTransitions] Stream complete (API finished)');
    
    // Only transition if not speaking - speech handlers take priority
    const completeState = getCompleteState();
    if (completeState) {
      setAnimationState(completeState.state_key);
    }

    setTimeout(() => {
      transitionToListen();
    }, 2000);
  }, [getCompleteState, setAnimationState, transitionToListen]);

  const onShowingProduct = useCallback(() => {
    if (manualMode) return;
    setChatStage('showing_product');
    console.log('[StateTransitions] Showing products');
    
    const showingState = states.find(s => 
      s.chat_trigger === 'showing_product' || 
      s.state_key === 'showing_product'
    );
    
    if (showingState) {
      setAnimationState(showingState.state_key);
    }

    setTimeout(() => {
      transitionToListen();
    }, 3000);
  }, [manualMode, states, setAnimationState, transitionToListen]);

  useEffect(() => {
    return () => clearIdleTimer();
  }, [clearIdleTimer]);

  return {
    chatStage,
    initialize,
    onUserInput,
    onSpeechStart,
    onSpeechEnd,
    onStreamStart,
    onStreamComplete,
    onShowingProduct,
    getStateSettings
  };
};
