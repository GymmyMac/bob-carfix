import { useState, useCallback, useRef, useEffect } from "react";
import { useBobContext } from "../BobProvider";

interface UseSpeechSynthesisProps {
  onStart?: () => void;
  onEnd?: () => void;
  onFailed?: () => void;
}

// Timeout for TTS requests - generous to allow longer responses
const TTS_TIMEOUT_MS = 15000;

// Pattern matching for pre-recorded audio clips
// These patterns identify standard phrases that can use cached MP3s
const CLIP_PATTERNS: Record<string, RegExp> = {
  greeting_returning: /ah hey|you again|what you after this time/i,
  greeting_welcome: /g'?day|welcome.*carfix|bob.*here/i,
  ask_rego: /need your rego|rego.*get cracking|what('?s| is) your rego/i,
  vehicle_not_found: /couldn'?t find that|double.?check.*plate/i,
  no_parts_found: /nothing came up|no results|sorry.*search/i,
  checkout_ready: /ready to checkout|checkout.*ready|choice.*checkout/i,
  rego_searching: /let('?s| us) see what car|sweet.*searching|searching for/i,
};

// In-memory cache for clip lookups (persists across renders)
const clipCache = new Map<string, { audio_url: string } | null>();

// Sanitize text for TTS - fix pronunciation issues
const sanitizeForTTS = (text: string): string => {
  return text.replace(/\bya\b/gi, 'you');
};

export const useSpeechSynthesis = ({
  onStart,
  onEnd,
  onFailed,
}: UseSpeechSynthesisProps = {}) => {
  const { bobConfig, supabase } = useBobContext();
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

  // Fetch pre-recorded audio clip from database with caching
  const fetchAudioClip = useCallback(async (clipKey: string): Promise<{ audio_url: string } | null> => {
    // Check cache first
    if (clipCache.has(clipKey)) {
      const cached = clipCache.get(clipKey);
      console.log(`[BobWidget TTS] Cache hit for clip: ${clipKey}`, cached ? 'found' : 'null');
      return cached || null;
    }

    try {
      console.log(`[BobWidget TTS] Fetching clip from DB: ${clipKey}`);
      const { data, error } = await supabase
        .from('bob_audio_clips')
        .select('audio_url')
        .eq('clip_key', clipKey)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.log(`[BobWidget TTS] No clip found for: ${clipKey}`);
        clipCache.set(clipKey, null);
        return null;
      }

      console.log(`[BobWidget TTS] Clip found: ${clipKey} -> ${data.audio_url}`);
      clipCache.set(clipKey, data);
      return data;
    } catch (error) {
      console.warn(`[BobWidget TTS] Clip lookup failed for ${clipKey}:`, error);
      clipCache.set(clipKey, null);
      return null;
    }
  }, [supabase]);

  // Try to match text against pre-recorded clip patterns
  const tryMatchPrerecordedClip = useCallback(async (text: string): Promise<string | null> => {
    for (const [clipKey, pattern] of Object.entries(CLIP_PATTERNS)) {
      if (pattern.test(text)) {
        console.log(`[BobWidget TTS] Pattern matched: ${clipKey}`);
        const clip = await fetchAudioClip(clipKey);
        if (clip?.audio_url) {
          return clip.audio_url;
        }
      }
    }
    return null;
  }, [fetchAudioClip]);

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
      let audioUrl: string | null = null;

      // ========== NEW: Try pre-recorded clip first ==========
      audioUrl = await tryMatchPrerecordedClip(text);
      
      if (audioUrl) {
        console.log("[BobWidget TTS] Using pre-recorded audio (fast path)");
      } else {
        // ========== FALLBACK: Use ElevenLabs TTS ==========
        console.log("[BobWidget TTS] No pre-recorded clip, using ElevenLabs TTS");
        
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

        const audioBlob = await response.blob();
        audioUrl = URL.createObjectURL(audioBlob);
      }
      
      // ========== UNCHANGED: Audio playback with animation callbacks ==========
      // This works identically for pre-recorded OR TTS audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        clearTtsTimeout();
        pendingGreetingRef.current = null;
        if (!startTriggeredRef.current) {
          startTriggeredRef.current = true;
          setIsSpeaking(true);
          console.log("[BobWidget TTS] Audio playing, triggering onStart (animation: TALKING)");
          onStartRef.current?.();  // ← Bob starts TALKING animation
        }
      };

      audio.onended = () => {
        clearTtsTimeout();
        setIsSpeaking(false);
        greetingPlayingRef.current = false;
        console.log("[BobWidget TTS] Audio ended, triggering onEnd (animation: COMPLETE/IDLE)");
        onEndRef.current?.();  // ← Bob transitions to COMPLETE/IDLE
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
        onFailedRef.current?.();  // ← Graceful fallback
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
  }, [bobConfig.supabaseUrl, bobConfig.supabaseKey, clearTtsTimeout, triggerFallbackStart, tryMatchPrerecordedClip]);

  const speak = useCallback((text: string, isGreeting = false) => {
    if (!text.trim()) return;

    // Prevent duplicate greeting playback
    if (isGreeting) {
      if (lastQueuedGreetingRef.current === text) {
        console.log(`[BobWidget TTS] Ignoring duplicate greeting: "${text.substring(0, 30)}..."`);
        return;
      }
      lastQueuedGreetingRef.current = text;
      // Clear pending since we're about to queue it
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
    // Only retry if we have a pending greeting AND audio isn't already playing
    if (pendingGreetingRef.current && !audioRef.current && !isProcessingRef.current) {
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
