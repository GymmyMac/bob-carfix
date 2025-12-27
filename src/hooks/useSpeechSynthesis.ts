import { useState, useCallback, useRef, useEffect } from "react";

interface UseSpeechSynthesisProps {
  onStart?: () => void;
  onEnd?: () => void;
  onFailed?: () => void;
}

const TTS_TIMEOUT_MS = 5000; // 5 second timeout for TTS

export const useSpeechSynthesis = ({
  onStart,
  onEnd,
  onFailed,
}: UseSpeechSynthesisProps = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTriggeredRef = useRef(false);

  const clearTimeout_ = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const triggerFallbackStart = useCallback(() => {
    // Ensure onStart is called exactly once per speak() call
    if (!startTriggeredRef.current) {
      startTriggeredRef.current = true;
      console.log("TTS fallback: triggering onStart without audio");
      onStart?.();
    }
  }, [onStart]);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Reset start trigger for this new speak call
    startTriggeredRef.current = false;
    clearTimeout_();

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Set up timeout fallback - if TTS doesn't play within 5s, trigger callbacks anyway
    timeoutRef.current = setTimeout(() => {
      console.warn("TTS timeout after 5s - triggering fallback callbacks");
      triggerFallbackStart();
      setIsSpeaking(false);
      onEnd?.();
      onFailed?.();
      audioRef.current = null;
    }, TTS_TIMEOUT_MS);

    try {
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS - 1000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bob-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        }
      );

      clearTimeout(fetchTimeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("TTS request failed:", errorData);
        throw new Error("TTS request failed");
      }

      const { audioContent } = await response.json();
      
      // Create audio element
      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
      audioRef.current = audio;

      // Trigger onStart when audio actually begins playing
      audio.onplay = () => {
        clearTimeout_();
        if (!startTriggeredRef.current) {
          startTriggeredRef.current = true;
          setIsSpeaking(true);
          console.log("TTS: audio playing, triggering onStart");
          onStart?.();
        }
      };

      audio.onended = () => {
        clearTimeout_();
        setIsSpeaking(false);
        onEnd?.();
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        clearTimeout_();
        console.warn("Audio playback error:", e);
        // Still trigger onStart as fallback to reveal products
        triggerFallbackStart();
        setIsSpeaking(false);
        onEnd?.();
        onFailed?.();
        audioRef.current = null;
      };

      // Try to play - may fail on mobile without user gesture
      try {
        await audio.play();
      } catch (playError) {
        console.warn("Audio play() failed (likely autoplay policy):", playError);
        clearTimeout_();
        // Trigger fallback - products should still show
        triggerFallbackStart();
        setIsSpeaking(false);
        onEnd?.();
        onFailed?.();
        audioRef.current = null;
      }
    } catch (error) {
      clearTimeout_();
      console.error("Speech synthesis error:", error);
      // Always trigger onStart as fallback to reveal products
      triggerFallbackStart();
      setIsSpeaking(false);
      onEnd?.();
      onFailed?.();
    }
  }, [onStart, onEnd, onFailed, triggerFallbackStart]);

  const stop = useCallback(() => {
    clearTimeout_();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout_();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isSupported: true, // Always supported since we use backend API
  };
};
