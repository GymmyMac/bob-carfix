import { useState, useCallback, useRef, useEffect } from "react";

interface UseSpeechSynthesisProps {
  onStart?: () => void;
  onEnd?: () => void;
}

export const useSpeechSynthesis = ({
  onStart,
  onEnd,
}: UseSpeechSynthesisProps = {}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Don't set speaking state here - wait until audio actually plays
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bob-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("TTS request failed:", errorData);
        throw new Error("TTS request failed");
      }

      const { audioContent } = await response.json();
      
      // Create audio element
      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
      audioRef.current = audio;

      // Trigger onStart only when audio actually begins playing
      audio.onplay = () => {
        setIsSpeaking(true);
        onStart?.();
      };

      audio.onended = () => {
        setIsSpeaking(false);
        onEnd?.();
        audioRef.current = null;
      };

      audio.onerror = () => {
        console.warn("Audio playback error");
        setIsSpeaking(false);
        onEnd?.();
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error("Speech synthesis error:", error);
      setIsSpeaking(false);
      onEnd?.();
    }
  }, [onStart, onEnd]);

  const stop = useCallback(() => {
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
