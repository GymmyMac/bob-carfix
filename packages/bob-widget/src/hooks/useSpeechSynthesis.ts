import { useState, useCallback, useRef, useEffect } from "react";
import { useBobContext } from "../BobProvider";

interface UseSpeechSynthesisProps {
  onStart?: () => void;
  onEnd?: () => void;
  onFailed?: () => void;
}

// Timeout for TTS requests - generous to allow longer responses
const TTS_TIMEOUT_MS = 15000;

// Sanitize text for TTS - fix pronunciation issues
// Google TTS pronounces "ya" as "yah" instead of "yuh", so we replace with "you"
const sanitizeForTTS = (text: string): string => {
  // Replace "ya" with "you" at word boundaries to avoid false positives
  // This handles: "ya", "Ya", "YA" but not words like "kayak", "royal"
  return text.replace(/\bya\b/gi, 'you');
};

export const useSpeechSynthesis = ({
  onStart,
  onEnd,
  onFailed,
}: UseSpeechSynthesisProps = {}) => {
  const { bobConfig } = useBobContext();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTriggeredRef = useRef(false);
  
  // Queue for speech requests - greetings get priority
  const speechQueueRef = useRef<Array<{ text: string; isGreeting: boolean }>>([]);
  const isProcessingRef = useRef(false);
  const greetingPlayingRef = useRef(false);
  
  // Store pending greeting for user interaction retry
  const pendingGreetingRef = useRef<string | null>(null);
  
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);
  const onFailedRef = useRef(onFailed);
  
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
    if (!startTriggeredRef.current) {
      startTriggeredRef.current = true;
      console.log("[BobWidget TTS] Fallback: triggering onStart without audio");
      onStartRef.current?.();
    }
  }, []);

  // Process the speech queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || speechQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingRef.current = true;
    const item = speechQueueRef.current.shift();
    
    if (!item) {
      isProcessingRef.current = false;
      return;
    }
    
    const { text, isGreeting } = item;
    
    if (isGreeting) {
      greetingPlayingRef.current = true;
    }
    
    startTriggeredRef.current = false;
    clearTtsTimeout();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Set timeout for this speech attempt
    timeoutRef.current = setTimeout(() => {
      console.warn("[BobWidget TTS] Timeout - triggering fallback callbacks");
      triggerFallbackStart();
      setIsSpeaking(false);
      greetingPlayingRef.current = false;
      onEndRef.current?.();
      onFailedRef.current?.();
      audioRef.current = null;
      isProcessingRef.current = false;
      // Process next in queue
      processQueue();
    }, TTS_TIMEOUT_MS);

    try {
      // Sanitize text for TTS pronunciation before sending
      const sanitizedText = sanitizeForTTS(text);
      
      // Use ElevenLabs streaming endpoint for lower latency
      const response = await fetch(
        `${bobConfig.supabaseUrl}/functions/v1/bob-tts-elevenlabs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bobConfig.supabaseKey}`,
          },
          body: JSON.stringify({ text: sanitizedText }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[BobWidget TTS] Request failed:", errorData);
        throw new Error("TTS request failed");
      }

      // ElevenLabs returns audio blob directly (not base64)
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        clearTtsTimeout();
        pendingGreetingRef.current = null; // Clear pending since we're playing
        if (!startTriggeredRef.current) {
          startTriggeredRef.current = true;
          setIsSpeaking(true);
          console.log("[BobWidget TTS] Audio playing, triggering onStart");
          onStartRef.current?.();
        }
      };

      audio.onended = () => {
        clearTtsTimeout();
        setIsSpeaking(false);
        greetingPlayingRef.current = false;
        onEndRef.current?.();
        audioRef.current = null;
        isProcessingRef.current = false;
        // Process next in queue
        processQueue();
      };

      audio.onerror = (e) => {
        clearTtsTimeout();
        console.warn("[BobWidget TTS] Audio playback error:", e);
        triggerFallbackStart();
        setIsSpeaking(false);
        greetingPlayingRef.current = false;
        onEndRef.current?.();
        onFailedRef.current?.();
        audioRef.current = null;
        isProcessingRef.current = false;
        // Process next in queue
        processQueue();
      };

      try {
        await audio.play();
      } catch (playError) {
        console.warn("[BobWidget TTS] Audio play() failed (autoplay policy):", playError);
        clearTtsTimeout();
        
        // Store greeting for retry on user interaction
        if (isGreeting) {
          pendingGreetingRef.current = text;
          console.log("[BobWidget TTS] Greeting stored for retry on user interaction");
        }
        
        triggerFallbackStart();
        setIsSpeaking(false);
        greetingPlayingRef.current = false;
        onEndRef.current?.();
        isProcessingRef.current = false;
        // Process next in queue
        processQueue();
      }
    } catch (error) {
      clearTtsTimeout();
      console.error("[BobWidget TTS] Speech synthesis error:", error);
      triggerFallbackStart();
      setIsSpeaking(false);
      greetingPlayingRef.current = false;
      onEndRef.current?.();
      onFailedRef.current?.();
      isProcessingRef.current = false;
      // Process next in queue
      processQueue();
    }
  }, [bobConfig.supabaseUrl, bobConfig.supabaseKey, clearTtsTimeout, triggerFallbackStart]);

  const speak = useCallback((text: string, isGreeting = false) => {
    if (!text.trim()) return;

    // If a greeting is currently playing, queue non-greeting messages
    if (greetingPlayingRef.current && !isGreeting) {
      console.log("[BobWidget TTS] Greeting playing - queueing message");
      speechQueueRef.current.push({ text, isGreeting });
      return;
    }

    // Greetings go to front of queue, others to back
    if (isGreeting) {
      speechQueueRef.current.unshift({ text, isGreeting });
    } else {
      speechQueueRef.current.push({ text, isGreeting });
    }
    
    processQueue();
  }, [processQueue]);

  // Retry pending greeting on user interaction
  const retryPendingGreeting = useCallback(() => {
    if (pendingGreetingRef.current) {
      console.log("[BobWidget TTS] Retrying pending greeting on user interaction");
      const greetingText = pendingGreetingRef.current;
      pendingGreetingRef.current = null;
      speak(greetingText, true);
    }
  }, [speak]);

  const stop = useCallback(() => {
    clearTtsTimeout();
    speechQueueRef.current = []; // Clear queue
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    greetingPlayingRef.current = false;
    isProcessingRef.current = false;
  }, [clearTtsTimeout]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play();
  }, []);

  useEffect(() => {
    return () => {
      clearTtsTimeout();
      speechQueueRef.current = [];
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
    isSupported: true,
    retryPendingGreeting,
  };
};
