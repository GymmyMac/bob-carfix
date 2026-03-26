import { useState, useCallback, useRef, useEffect } from "react";
import { useBobContext } from "../BobProvider";
import {
  playAudioBuffer,
  resumeAudioContext,
  type PlaybackHandle,
} from "../utils/iosAudioUnlock";

interface UseSpeechSynthesisProps {
  onStart?: () => void;
  onEnd?: () => void;
  onFailed?: () => void;
}

// Timeout for TTS requests - generous to allow longer responses
const TTS_TIMEOUT_MS = 15000;

// Sanitize text for TTS - fix pronunciation issues
const sanitizeForTTS = (text: string): string => {
  return text.replace(/\bya\b/gi, 'you');
};

export const useSpeechSynthesis = ({
  onStart,
  onEnd,
  onFailed,
}: UseSpeechSynthesisProps = {}) => {
  const { bobConfig, bobSupabase: supabase } = useBobContext();
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Replaced HTMLAudioElement ref with Web Audio API PlaybackHandle
  const playbackRef = useRef<PlaybackHandle | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTriggeredRef = useRef(false);

  // Queue for speech requests - greetings get priority
  const speechQueueRef = useRef<Array<{ text: string; isGreeting: boolean }>>([]);
  const isProcessingRef = useRef(false);
  const greetingPlayingRef = useRef(false);

  // Store pending greeting for user interaction retry
  const pendingGreetingRef = useRef<string | null>(null);

  // Track last queued greeting to prevent duplicates
  const lastQueuedGreetingRef = useRef<string | null>(null);

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

    // Stop any current playback
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }

    // Set timeout for this speech attempt
    timeoutRef.current = setTimeout(() => {
      console.warn("[BobWidget TTS] Timeout - triggering fallback callbacks");
      triggerFallbackStart();
      setIsSpeaking(false);
      greetingPlayingRef.current = false;
      onEndRef.current?.();
      onFailedRef.current?.();
      playbackRef.current = null;
      isProcessingRef.current = false;
      processQueue();
    }, TTS_TIMEOUT_MS);

    try {
      console.log("[BobWidget TTS] Using ElevenLabs TTS");

      const sanitizedText = sanitizeForTTS(text);
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

      const audioArrayBuffer = await response.arrayBuffer();

      // ========== Play via shared AudioContext ==========
      await resumeAudioContext();

      const handle = await playAudioBuffer(
        audioArrayBuffer,
        () => {
          clearTtsTimeout();
          pendingGreetingRef.current = null;
          if (!startTriggeredRef.current) {
            startTriggeredRef.current = true;
            setIsSpeaking(true);
            console.log("[BobWidget TTS] Audio playing via AudioContext, triggering onStart");
            onStartRef.current?.();
          }
        },
        () => {
          clearTtsTimeout();
          setIsSpeaking(false);
          greetingPlayingRef.current = false;
          console.log("[BobWidget TTS] Audio ended, triggering onEnd");
          onEndRef.current?.();
          playbackRef.current = null;
          isProcessingRef.current = false;
          processQueue();
        },
      );

      playbackRef.current = handle;
    } catch (error) {
      clearTtsTimeout();

      // If it's a greeting and AudioContext isn't running, store for retry
      if (isGreeting) {
        pendingGreetingRef.current = text;
        console.log("[BobWidget TTS] Greeting stored for retry on user interaction");
      }

      console.error("[BobWidget TTS] Speech synthesis error:", error);
      triggerFallbackStart();
      setIsSpeaking(false);
      greetingPlayingRef.current = false;
      onEndRef.current?.();
      onFailedRef.current?.();
      isProcessingRef.current = false;
      processQueue();
    }
  }, [bobConfig.supabaseUrl, bobConfig.supabaseKey, clearTtsTimeout, triggerFallbackStart]);

  const speak = useCallback((text: string, isGreeting = false) => {
    if (!text.trim()) return;

    // Prevent duplicate greeting playback
    if (isGreeting) {
      if (lastQueuedGreetingRef.current === text) {
        console.log(`[BobWidget TTS] Ignoring duplicate greeting: "${text.substring(0, 30)}..."`);
        return;
      }
      lastQueuedGreetingRef.current = text;
      pendingGreetingRef.current = null;
    }

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
    if (pendingGreetingRef.current && !playbackRef.current && !isProcessingRef.current) {
      console.log("[BobWidget TTS] Retrying pending greeting on user interaction");
      const greetingText = pendingGreetingRef.current;
      pendingGreetingRef.current = null;
      speak(greetingText, true);
    }
  }, [speak]);

  const stop = useCallback((suppressCallbacks = false) => {
    clearTtsTimeout();
    speechQueueRef.current = [];
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }
    setIsSpeaking(false);
    greetingPlayingRef.current = false;
    isProcessingRef.current = false;
    if (!suppressCallbacks) {
      onEndRef.current?.();
    }
  }, [clearTtsTimeout]);

  const pause = useCallback(() => {
    // Web Audio API doesn't support pause on BufferSourceNode
    // Stop is the equivalent — the queue will continue with next item
    if (playbackRef.current) {
      playbackRef.current.stop();
    }
  }, []);

  const resume = useCallback(() => {
    // No-op: Web Audio BufferSourceNode can't be resumed after stop
    // Left for API compatibility
  }, []);

  useEffect(() => {
    return () => {
      clearTtsTimeout();
      speechQueueRef.current = [];
      if (playbackRef.current) {
        playbackRef.current.stop();
        playbackRef.current = null;
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
