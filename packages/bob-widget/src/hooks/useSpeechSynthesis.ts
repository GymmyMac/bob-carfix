import { useState, useCallback, useRef, useEffect } from "react";
import { useBobContext } from "../BobProvider";

interface UseSpeechSynthesisProps {
  onStart?: () => void;
  onEnd?: () => void;
  onFailed?: () => void;
}

const TTS_TIMEOUT_MS = 5000;

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

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    startTriggeredRef.current = false;
    clearTtsTimeout();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    timeoutRef.current = setTimeout(() => {
      console.warn("[BobWidget TTS] Timeout after 5s - triggering fallback callbacks");
      triggerFallbackStart();
      setIsSpeaking(false);
      onEndRef.current?.();
      onFailedRef.current?.();
      audioRef.current = null;
    }, TTS_TIMEOUT_MS);

    try {
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS - 1000);

      const response = await fetch(
        `${bobConfig.supabaseUrl}/functions/v1/bob-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bobConfig.supabaseKey}`,
          },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        }
      );

      clearTimeout(fetchTimeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[BobWidget TTS] Request failed:", errorData);
        throw new Error("TTS request failed");
      }

      const { audioContent } = await response.json();
      
      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
      audioRef.current = audio;

      audio.onplay = () => {
        clearTtsTimeout();
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
        onEndRef.current?.();
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        clearTtsTimeout();
        console.warn("[BobWidget TTS] Audio playback error:", e);
        triggerFallbackStart();
        setIsSpeaking(false);
        onEndRef.current?.();
        onFailedRef.current?.();
        audioRef.current = null;
      };

      try {
        await audio.play();
      } catch (playError) {
        console.warn("[BobWidget TTS] Audio play() failed (likely autoplay policy):", playError);
        clearTtsTimeout();
        triggerFallbackStart();
        setIsSpeaking(false);
        onEndRef.current?.();
        onFailedRef.current?.();
        audioRef.current = null;
      }
    } catch (error) {
      clearTtsTimeout();
      console.error("[BobWidget TTS] Speech synthesis error:", error);
      triggerFallbackStart();
      setIsSpeaking(false);
      onEndRef.current?.();
      onFailedRef.current?.();
    }
  }, [bobConfig.supabaseUrl, bobConfig.supabaseKey, clearTtsTimeout, triggerFallbackStart]);

  const stop = useCallback(() => {
    clearTtsTimeout();
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
  };
};
