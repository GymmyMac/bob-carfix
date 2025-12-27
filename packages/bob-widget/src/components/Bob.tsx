import React, { useState, useEffect } from "react";
import { useBobContext } from "../BobProvider";
import { useBobChat } from "../hooks/useBobChat";
import { BobCharacter } from "./BobCharacter";
import { ChatInterface } from "./ChatInterface";

export type BobVariant = "inline" | "floating" | "fullscreen";

interface BobProps {
  /** Display variant */
  variant?: BobVariant;
  /** Initial animation state */
  initialState?: string;
  /** Show chat interface */
  showChat?: boolean;
  /** Custom class name */
  className?: string;
  /** Backdrop image URL */
  backdropUrl?: string;
  /** Counter overlay image URL */
  counterOverlayUrl?: string;
  /** Counter height as percentage */
  counterHeightPercent?: number;
  /** Default Bob image when no animations loaded */
  defaultBobImage?: string;
  /** Vertical offset for Bob positioning */
  verticalOffset?: number;
  /** Scale factor for Bob (100 = 100%) */
  scale?: number;
}

/**
 * Main Bob component - combines character animation and chat interface
 * 
 * @example
 * ```tsx
 * <Bob 
 *   variant="inline"
 *   showChat={true}
 *   backdropUrl="https://example.com/backdrop.png"
 *   counterOverlayUrl="https://example.com/counter.png"
 * />
 * ```
 */
export const Bob: React.FC<BobProps> = ({
  variant = "inline",
  initialState = "idle",
  showChat = true,
  className = "",
  backdropUrl,
  counterOverlayUrl,
  counterHeightPercent = 12,
  defaultBobImage,
  verticalOffset = 0,
  scale = 100
}) => {
  const { bobSupabase } = useBobContext();
  const [animationState, setAnimationState] = useState(initialState);
  const [currentImage, setCurrentImage] = useState(defaultBobImage || "");
  const [animationImages, setAnimationImages] = useState<Record<string, string[]>>({});
  const [imageIndex, setImageIndex] = useState(0);

  // Load animation images from Bob's Supabase
  useEffect(() => {
    const loadAnimations = async () => {
      try {
        const { data, error } = await bobSupabase
          .from('bob_animations')
          .select('animation_state, image_url')
          .eq('is_active', true)
          .order('sequence_order', { ascending: true });

        if (error) {
          console.error('[BobWidget] Failed to load animations:', error);
          return;
        }

        const grouped: Record<string, string[]> = {};
        for (const row of data || []) {
          if (!grouped[row.animation_state]) {
            grouped[row.animation_state] = [];
          }
          grouped[row.animation_state].push(row.image_url);
        }

        setAnimationImages(grouped);

        // Set initial image
        if (grouped[initialState]?.[0]) {
          setCurrentImage(grouped[initialState][0]);
        }
      } catch (error) {
        console.error('[BobWidget] Animation load error:', error);
      }
    };

    loadAnimations();
  }, [bobSupabase, initialState]);

  // Animate through frames for current state
  useEffect(() => {
    const frames = animationImages[animationState];
    if (!frames || frames.length <= 1) {
      if (frames?.[0]) setCurrentImage(frames[0]);
      return;
    }

    let frameIndex = 0;
    const interval = setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      setCurrentImage(frames[frameIndex]);
      setImageIndex(frameIndex);
    }, 150); // ~6.6 fps

    return () => clearInterval(interval);
  }, [animationState, animationImages]);

  const bobChat = useBobChat({
    setAnimationState,
    manualMode: false,
    onReadyToSpeak: () => {
      console.log('[BobWidget] Ready to speak');
    },
    onStreamComplete: () => {
      setAnimationState('idle');
    }
  });

  const variantClasses = {
    inline: "",
    floating: "fixed bottom-4 right-4 w-96 z-50 shadow-2xl rounded-lg overflow-hidden",
    fullscreen: "fixed inset-0 z-50 bg-black/80"
  };

  return (
    <div className={`${variantClasses[variant]} ${className}`}>
      {currentImage && (
        <BobCharacter
          currentImage={currentImage}
          animationState={animationState}
          backdropUrl={backdropUrl}
          counterOverlayUrl={counterOverlayUrl}
          counterHeightPercent={counterHeightPercent}
          verticalOffset={verticalOffset}
          scale={scale}
        />
      )}
      
      {showChat && (
        <ChatInterface
          messages={bobChat.messages}
          input={bobChat.input}
          setInput={bobChat.setInput}
          isLoading={bobChat.isLoading}
          onSend={bobChat.handleSend}
          onKeyPress={bobChat.handleKeyPress}
          onInputFocus={bobChat.handleInputFocus}
          onInputBlur={bobChat.handleInputBlur}
          chatEndRef={bobChat.chatEndRef}
          isMuted={bobChat.isMuted}
          onToggleMute={bobChat.toggleMute}
          isSpeaking={bobChat.isSpeaking}
        />
      )}
    </div>
  );
};
