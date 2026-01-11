import { useState, useCallback, useRef, useEffect } from "react";

interface UseSpeechSynthesisProps {
  onStart?: () => void;
  onEnd?: () => void;
  onFailed?: () => void;
}

const TTS_TIMEOUT_MS = 5000; // 5 second timeout for TTS

// Sanitize text for TTS - fix Kiwi slang pronunciation
const sanitizeForTTS = (text: string): string => {
  return text
    .replace(/\bya\b/gi, 'you')
    .replace(/\bon ya\b/gi, 'on you')
    .replace(/\bare ya\b/gi, 'are you')
    .replace(/\bsee ya\b/gi, 'see you')
    .replace(/\bhow are ya\b/gi, 'how are you')
    .replace(/\bgood on ya\b/gi, 'good on you')
    .replace(/\bfor ya\b/gi, 'for you')
    .replace(/\bto ya\b/gi, 'to you')
    .replace(/\bwith ya\b/gi, 'with you');
};

interface SpeechQueueItem {
  text: string;
  isGreeting: boolean;
}

export const useSpeechSynthesis = ({
  onStart,
  onEnd,
  onFailed,
}: UseSpeechSynthesisProps = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTriggeredRef = useRef(false);
  
  // Queue management refs
  const speechQueueRef = useRef<SpeechQueueItem[]>([]);
  const pendingGreetingRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  
  // Store callbacks in refs to avoid dependency issues
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);
  const onFailedRef = useRef(onFailed);
  
  // Keep refs updated
  useEffect(() => {
    onStartRef.current = onStart;
    onEndRef.current = onEnd;
    onFailedRef.current = onFailed;
  }, [onStart, onEnd, onFailed]);

  const clearTtsTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const triggerFallbackStart = useCallback(() => {
    // Ensure onStart is called exactly once per speak() call
    if (!startTriggeredRef.current) {
      startTriggeredRef.current = true;
      console.log("[TTS] Fallback: triggering onStart without audio");
      onStartRef.current?.();
    }
  }, []);

  const processQueue = useCallback(async () => {
    // Prevent concurrent processing
    if (isProcessingRef.current || speechQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const item = speechQueueRef.current.shift();
    
    if (!item || !item.text.trim()) {
      isProcessingRef.current = false;
      return;
    }

    const { text, isGreeting } = item;
    console.log(`[TTS] Processing ${isGreeting ? 'GREETING' : 'speech'}: "${text.substring(0, 50)}..."`);

    // Set speaking state immediately for animation sync
    setIsSpeaking(true);
    
    // Reset start trigger for this new speak call
    startTriggeredRef.current = false;
    clearTtsTimeout();

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Set up timeout fallback - if TTS doesn't play within 5s, trigger callbacks anyway
    timeoutRef.current = setTimeout(() => {
      console.warn("[TTS] Timeout after 5s - triggering fallback callbacks");
      triggerFallbackStart();
      setIsSpeaking(false);
      onEndRef.current?.();
      onFailedRef.current?.();
      audioRef.current = null;
      isProcessingRef.current = false;
      // Process next item in queue
      processQueue();
    }, TTS_TIMEOUT_MS);

    try {
      // Use ElevenLabs streaming endpoint for lower latency
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bob-tts-elevenlabs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: sanitizeForTTS(text) }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[TTS] Request failed:", errorData);
        throw new Error("TTS request failed");
      }

      // ElevenLabs returns audio blob directly (not base64)
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create audio element from blob URL
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Trigger onStart when audio actually begins playing
      audio.onplay = () => {
        clearTtsTimeout();
        if (!startTriggeredRef.current) {
          startTriggeredRef.current = true;
          console.log("[TTS] Audio playing, triggering onStart");
          onStartRef.current?.();
        }
      };

      audio.onended = () => {
        clearTtsTimeout();
        setIsSpeaking(false);
        console.log("[TTS] Audio ended");
        onEndRef.current?.();
        audioRef.current = null;
        isProcessingRef.current = false;
        // Process next item in queue
        processQueue();
      };

      audio.onerror = (e) => {
        clearTtsTimeout();
        console.warn("[TTS] Audio playback error:", e);
        triggerFallbackStart();
        setIsSpeaking(false);
        onEndRef.current?.();
        onFailedRef.current?.();
        audioRef.current = null;
        isProcessingRef.current = false;
        // Process next item in queue
        processQueue();
      };

      // Try to play
      try {
        await audio.play();
      } catch (playError) {
        console.warn("[TTS] Audio play() failed (likely autoplay policy):", playError);
        clearTtsTimeout();
        
        // Store greeting for retry on user interaction
        if (isGreeting) {
          console.log("[TTS] Storing greeting for retry on user interaction");
          pendingGreetingRef.current = text;
        }
        
        triggerFallbackStart();
        setIsSpeaking(false);
        onEndRef.current?.();
        onFailedRef.current?.();
        audioRef.current = null;
        isProcessingRef.current = false;
        // Process next item in queue
        processQueue();
      }
    } catch (error) {
      clearTtsTimeout();
      console.error("[TTS] Speech synthesis error:", error);
      triggerFallbackStart();
      setIsSpeaking(false);
      onEndRef.current?.();
      onFailedRef.current?.();
      isProcessingRef.current = false;
      // Process next item in queue
      processQueue();
    }
  }, [clearTtsTimeout, triggerFallbackStart]);

  const speak = useCallback((text: string, isGreeting = false) => {
    if (!text.trim()) return;

    console.log(`[TTS] Queuing ${isGreeting ? 'GREETING' : 'speech'}: "${text.substring(0, 50)}..."`);

    // Greetings go to front of queue with priority
    if (isGreeting) {
      speechQueueRef.current.unshift({ text, isGreeting });
    } else {
      speechQueueRef.current.push({ text, isGreeting });
    }
    
    // Start processing if not already
    processQueue();
  }, [processQueue]);

  const retryPendingGreeting = useCallback(() => {
    if (pendingGreetingRef.current) {
      console.log("[TTS] Retrying pending greeting on user interaction");
      const greetingText = pendingGreetingRef.current;
      pendingGreetingRef.current = null;
      speak(greetingText, true);
    }
  }, [speak]);

  const stop = useCallback(() => {
    clearTtsTimeout();
    // Clear the queue
    speechQueueRef.current = [];
    isProcessingRef.current = false;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, [clearTtsTimeout]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTtsTimeout();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [clearTtsTimeout]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isSupported: true, // Always supported since we use backend API
    retryPendingGreeting,
  };
};
