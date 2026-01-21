import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseSpeechSynthesisProps {
  onStart?: () => void;
  onEnd?: () => void;
  onFailed?: () => void;
}

const TTS_TIMEOUT_MS = 15000; // 15 second timeout for TTS

// Clip patterns for matching pre-recorded audio
const CLIP_PATTERNS: Record<string, RegExp> = {
  greeting_returning: /ah hey|you again|what you after this time/i,
  greeting_welcome: /g'?day|welcome.*carfix|bob.*here/i,
  ask_rego: /need your rego|rego.*get cracking|what('?s| is) your rego/i,
  vehicle_not_found: /couldn'?t find that|double.?check.*plate/i,
  no_parts_found: /nothing came up|no results|sorry.*search/i,
  checkout_ready: /ready to checkout|checkout.*ready|choice.*checkout/i,
  rego_searching: /let('?s| us) see what car|sweet.*searching|searching for/i,
};

// In-memory cache for audio clips
const clipCache = new Map<string, { audio_url: string } | null>();

// Fetch audio clip from database with caching
const fetchAudioClip = async (clipKey: string): Promise<{ audio_url: string } | null> => {
  if (clipCache.has(clipKey)) {
    console.log(`[TTS] Cache hit for clip: ${clipKey}`);
    return clipCache.get(clipKey) || null;
  }

  try {
    const { data, error } = await supabase
      .from('bob_audio_clips')
      .select('audio_url')
      .eq('clip_key', clipKey)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.log(`[TTS] No clip found for key: ${clipKey}`);
      clipCache.set(clipKey, null);
      return null;
    }

    console.log(`[TTS] Loaded clip from DB: ${clipKey} -> ${data.audio_url}`);
    clipCache.set(clipKey, data);
    return data;
  } catch (err) {
    console.warn(`[TTS] Error fetching clip ${clipKey}:`, err);
    clipCache.set(clipKey, null);
    return null;
  }
};

// Try to match text against pre-recorded clip patterns and fetch audio URL
const tryMatchPrerecordedClip = async (text: string): Promise<string | null> => {
  for (const [clipKey, pattern] of Object.entries(CLIP_PATTERNS)) {
    if (pattern.test(text)) {
      console.log(`[TTS] Pattern matched: ${clipKey}`);
      const clip = await fetchAudioClip(clipKey);
      if (clip?.audio_url) {
        return clip.audio_url;
      }
    }
  }
  return null;
};

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

    // Set up timeout fallback
    timeoutRef.current = setTimeout(() => {
      console.warn("[TTS] Timeout after 15s - triggering fallback callbacks");
      triggerFallbackStart();
      setIsSpeaking(false);
      onEndRef.current?.();
      onFailedRef.current?.();
      audioRef.current = null;
      isProcessingRef.current = false;
      processQueue();
    }, TTS_TIMEOUT_MS);

    try {
      let audioUrl: string | null = null;
      let isPrerecorded = false;

      // PRIORITY 1: Try pre-recorded clip first (fast path - no API call)
      audioUrl = await tryMatchPrerecordedClip(text);
      if (audioUrl) {
        console.log("[TTS] Using pre-recorded audio (fast path)");
        isPrerecorded = true;
      }

      // PRIORITY 2: Fall back to ElevenLabs TTS
      if (!audioUrl) {
        console.log("[TTS] No pre-recorded clip, fetching from ElevenLabs...");
        
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
          console.error("[TTS] ElevenLabs request failed:", errorData);
          throw new Error("TTS request failed");
        }

        console.log("[TTS] ElevenLabs audio received, creating blob URL...");
        const audioBlob = await response.blob();
        console.log("[TTS] Blob size:", audioBlob.size, "bytes, type:", audioBlob.type);
        audioUrl = URL.createObjectURL(audioBlob);
      }

      // Create and play audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      console.log(`[TTS] Audio element created (${isPrerecorded ? 'pre-recorded' : 'ElevenLabs'}), attempting playback...`);

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
        processQueue();
      };

      try {
        await audio.play();
      } catch (playError) {
        console.warn("[TTS] Audio play() failed (likely autoplay policy):", playError);
        clearTtsTimeout();
        
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
    isSupported: true,
    retryPendingGreeting,
  };
};
