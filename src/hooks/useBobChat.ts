import { useState, useEffect, useRef, useCallback } from "react";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import type { Vehicle, VariantCard } from "@/types/vehicle";
import type { ServicePackage } from "@/types/servicePackage";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface HighlightedProduct {
  brand: string;
  price: number;
}

export type AnimationState = string;

// Use the APIPart type from types/product for consistency
import type { APIPart } from "@/types/product";

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface UseBobChatProps {
  setAnimationState: (state: AnimationState) => void;
  manualMode?: boolean;
  talkingState?: string;
  thinkingState?: string;
  completeState?: string;
  idleState?: string;
  listenState?: string;
  initialVehicle?: Vehicle | null;
  customerEmail?: string | null;
  onStreamStart?: () => void;
  onStreamComplete?: () => void;
  onShowingProduct?: () => void;
  onResearchStart?: () => void;
  onReadyToSpeak?: () => void;
  onHighlightPart?: (partType: string) => void;
  onHighlightProduct?: (product: HighlightedProduct) => void;
  onNoPartsFound?: () => void;
  onAutoFetchComplete?: () => void;
  onVehicleIdentified?: (vehicle: Vehicle) => void;
  onMultipleVehiclesFound?: () => void;
  onPartsFound?: (parts: APIPart[], isAutoFetch?: boolean) => void;
  onServicePackagesFound?: (packages: ServicePackage[]) => void;
  onCartUpdated?: (items: CartItem[]) => void;
  // NEW: Variant selection for UI cards
  onVariantSelectionRequired?: (variants: VariantCard[], make: string, model: string) => void;
}

// Product keywords for detecting recommendations
const PRODUCT_KEYWORDS = [
  'recommend', 'suggest', 'need', 'part', 'filter', 'brake', 'rotor',
  'oil', 'price', '$', 'stock', 'available', 'pads', 'disc', 'spark plug'
];

/**
 * Sanitizes content to remove raw function call patterns
 */
const sanitizeContent = (text: string): string => {
  if (!text) return text;
  
  let sanitized = text;
  sanitized = sanitized.replace(
    /\b(retrieve_parts|lookup_vehicle|search_general_products|retrieve_service_packages|add_to_cart|get_cart|create_checkout|get_customer_context|get_product_details|search_products|check_vehicle_fitment|search_web)\s*\([^)]*\)/gi,
    ''
  );
  sanitized = sanitized.replace(/\(\s*\)/g, '');
  sanitized = sanitized.replace(/\s{2,}/g, ' ');
  
  return sanitized.trim();
};

export const useBobChat = ({ 
  setAnimationState, 
  manualMode = false,
  talkingState = "talk",
  thinkingState = "research",
  completeState = "complete",
  idleState = "idle",
  listenState = "talk_pause",
  initialVehicle,
  customerEmail,
  onStreamStart,
  onStreamComplete,
  onShowingProduct,
  onResearchStart,
  onReadyToSpeak,
  onHighlightPart,
  onHighlightProduct,
  onNoPartsFound,
  onAutoFetchComplete,
  onVehicleIdentified,
  onMultipleVehiclesFound,
  onPartsFound,
  onServicePackagesFound,
  onCartUpdated,
  onVariantSelectionRequired
}: UseBobChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [identifiedVehicle, setIdentifiedVehicle] = useState<Vehicle | null>(initialVehicle || null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoFetchTriggeredRef = useRef(false);
  const initialGreetingSentRef = useRef(false);
  const latestAssistantMessageRef = useRef<string>("");
  const audioHintUrlRef = useRef<string | null>(null);
  
  // Searching audio queue for sequential playback (vehicle + parts)
  const searchingAudioQueueRef = useRef<string[]>([]);
  const isPlayingSearchingRef = useRef(false);
  const currentSearchingAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // NEW: Vehicle candidates for multi-variant selection persistence
  const vehicleCandidatesRef = useRef<unknown[]>([]);
  
  // NEW: Conversation state for UI hints
  const conversationStateRef = useRef<string>('AWAITING_REGO');

  const { speak, stop: stopSpeech, isSpeaking, retryPendingGreeting } = useSpeechSynthesis({
    onStart: () => {
      console.log('[useBobChat] Speech STARTED - switching to talk state');
      onReadyToSpeak?.();
      if (!manualMode) {
        safeSetState(talkingState);
      }
    },
    onEnd: () => {
      console.log('[useBobChat] Speech ENDED - transitioning state');
      const hasProductContent = PRODUCT_KEYWORDS.some(keyword => 
        latestAssistantMessageRef.current.toLowerCase().includes(keyword.toLowerCase())
      );

      if (!manualMode) {
        if (hasProductContent && onShowingProduct) {
          onShowingProduct();
        } else if (onStreamComplete) {
          onStreamComplete();
        } else {
          safeSetState(completeState);
          setTimeout(() => safeSetState(listenState), 3000);
        }
      }
    }
  });

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Set vehicle from initialVehicle prop
  useEffect(() => {
    if (initialVehicle && !identifiedVehicle) {
      setIdentifiedVehicle(initialVehicle);
      onVehicleIdentified?.(initialVehicle);
    }
  }, [initialVehicle]);

  // Send initial greeting
  useEffect(() => {
    if (messages.length === 0 && !initialGreetingSentRef.current) {
      initialGreetingSentRef.current = true;
      
      let greetingMessage: string;
      if (initialVehicle) {
        const vehicleName = `${initialVehicle.year} ${initialVehicle.make} ${initialVehicle.model}`;
        greetingMessage = `G'day! Saw you've got the ${vehicleName} - choice wagon! What can I help you find for it today?`;
      } else {
        greetingMessage = "G'day! Bob from CARFIX here. How can I help ya today?";
      }
      
      setMessages([{ role: "assistant", content: greetingMessage }]);
      
      if (!isMuted) {
        console.log('[useBobChat] Speaking initial greeting (priority)');
        // Small delay to let the page settle
        setTimeout(() => speak(greetingMessage, true), 500);
      }
    }
  }, [initialVehicle, messages.length, isMuted, speak]);

  // Retry pending greeting on first user interaction (click/touch)
  useEffect(() => {
    const handleFirstInteraction = () => {
      console.log('[useBobChat] User interaction detected - retrying pending greeting');
      retryPendingGreeting();
      // Remove listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('touchstart', handleFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [retryPendingGreeting]);

  // Auto-fetch parts when vehicle is provided
  useEffect(() => {
    if (!initialVehicle || autoFetchTriggeredRef.current) return;

    const rawVehicleId = initialVehicle.vehicle_id ?? initialVehicle.id;
    const vehicleIdNum = Number.parseInt(String(rawVehicleId), 10);

    if (!Number.isFinite(vehicleIdNum)) return;

    autoFetchTriggeredRef.current = true;

    const fetchPartsForVehicle = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bob-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [],
            vehicleContext: { ...initialVehicle, vehicle_id: String(vehicleIdNum) },
            customerEmail,
            autoFetchParts: true,
          }),
        });

        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.type === "service_packages_found" && parsed.packages) {
                onServicePackagesFound?.(parsed.packages);
              }
              if (parsed.type === "parts_found" && parsed.parts) {
                onPartsFound?.(parsed.parts, true);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }

        onAutoFetchComplete?.();
      } catch (error) {
        console.error('[useBobChat] Auto-fetch error:', error);
      }
    };

    fetchPartsForVehicle();
  }, [initialVehicle, customerEmail]);

  const safeSetState = useCallback((state: AnimationState) => {
    try {
      setAnimationState(state);
    } catch (error) {
      console.warn(`[useBobChat] State "${state}" not available`);
    }
  }, [setAnimationState]);

  // Sequential audio player for searching events
  const playNextSearchingAudio = useCallback(() => {
    if (searchingAudioQueueRef.current.length === 0) {
      isPlayingSearchingRef.current = false;
      // Return to thinking state when all searching audio completes
      if (!manualMode) {
        safeSetState(thinkingState);
      }
      return;
    }
    
    isPlayingSearchingRef.current = true;
    const url = searchingAudioQueueRef.current.shift()!;
    const audio = new Audio(url);
    currentSearchingAudioRef.current = audio;
    
    audio.onplay = () => {
      console.log('[useBobChat] Searching audio STARTED:', url);
      if (!manualMode) safeSetState(talkingState);
    };
    
    audio.onended = () => {
      console.log('[useBobChat] Searching audio ENDED, playing next...');
      currentSearchingAudioRef.current = null;
      playNextSearchingAudio();
    };
    
    audio.onerror = () => {
      console.warn('[useBobChat] Searching audio failed:', url);
      currentSearchingAudioRef.current = null;
      playNextSearchingAudio();
    };
    
    audio.play().catch(() => {
      console.warn('[useBobChat] Searching audio autoplay blocked:', url);
      currentSearchingAudioRef.current = null;
      playNextSearchingAudio();
    });
  }, [manualMode, safeSetState, thinkingState, talkingState]);

  const streamChat = async (userMessage: Message) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bob-chat`;
    
    try {
      const requestBody: Record<string, unknown> = { 
        messages: [...messages, userMessage],
      };
      
      if (identifiedVehicle) {
        requestBody.vehicleContext = identifiedVehicle;
      }
      
      if (customerEmail) {
        requestBody.customerEmail = customerEmail;
      }
      
      // DEBUG: Log vehicle candidates state BEFORE building request
      console.log('[useBobChat DEBUG] vehicleCandidatesRef.current.length:', vehicleCandidatesRef.current?.length);
      console.log('[useBobChat DEBUG] conversationStateRef.current:', conversationStateRef.current);
      
      // NEW: Include stored vehicle candidates for deterministic variant selection
      if (vehicleCandidatesRef.current && vehicleCandidatesRef.current.length > 0) {
        requestBody.vehicleCandidates = vehicleCandidatesRef.current;
        console.log('[useBobChat] ✅ Including', vehicleCandidatesRef.current.length, 'vehicle candidates in request');
      } else {
        console.log('[useBobChat] ⚠️ No vehicle candidates to include - ref is empty');
      }
      
      console.log('[useBobChat] Request body keys:', Object.keys(requestBody));
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            
            // DEBUG: Log all incoming event types to trace SSE flow
            if (parsed.type) {
              console.log('[useBobChat] SSE event type:', parsed.type);
            }
            
            // NEW: Handle conversation_state event for UI sync
            if (parsed.type === "conversation_state") {
              console.log('[useBobChat] 🔄 conversation_state event received:', parsed.state);
              conversationStateRef.current = parsed.state;
              // Store candidates if provided
              if (parsed.candidates && Array.isArray(parsed.candidates)) {
                vehicleCandidatesRef.current = parsed.candidates;
                console.log('[useBobChat] ✅ Stored', parsed.candidates.length, 'vehicle candidates from state event');
              }
              continue;
            }
            
            // Handle vehicle candidates for multi-variant selection
            if (parsed.type === "vehicle_candidates_found" && parsed.candidates) {
              console.log('[useBobChat] 📦 vehicle_candidates_found event received:', parsed.candidates.length, 'candidates');
              vehicleCandidatesRef.current = parsed.candidates;
              continue;
            }
            
            // PRIORITY: Handle variant_selection_required for UI cards BEFORE other events
            // This must trigger immediately when multiple variants are detected
            if (parsed.type === "variant_selection_required") {
              console.log('[useBobChat] 🎴 variant_selection_required event received:', parsed.candidates?.length || 0, 'cards');
              if (parsed.candidates && Array.isArray(parsed.candidates)) {
                onVariantSelectionRequired?.(parsed.candidates, parsed.make || '', parsed.model || '');
              }
              continue;
            }
            
            if (parsed.type === "vehicle_identified" && parsed.vehicle) {
              setIdentifiedVehicle(parsed.vehicle);
              // Clear candidates when vehicle is confirmed
              vehicleCandidatesRef.current = [];
              conversationStateRef.current = 'VEHICLE_CONFIRMED';
              onVehicleIdentified?.(parsed.vehicle);
              continue;
            }
            
            if (parsed.type === "multiple_vehicles_found") {
              onMultipleVehiclesFound?.();
              continue;
            }
            
            if (parsed.type === "service_packages_found" && parsed.packages) {
              onServicePackagesFound?.(parsed.packages);
              continue;
            }
            
            if (parsed.type === "parts_found" && parsed.parts) {
              onPartsFound?.(parsed.parts);
              continue;
            }
            
            if (parsed.type === "no_parts_found") {
              onNoPartsFound?.();
              continue;
            }
            
            // Handle audio_hint for canned responses - bypass TTS entirely
            if (parsed.type === "audio_hint" && parsed.audio_url) {
              console.log('[useBobChat] Audio hint received:', parsed.clip_key, parsed.audio_url);
              audioHintUrlRef.current = parsed.audio_url;
              continue;
            }
            
            // Handle bob_searching event - play audio immediately while search runs
            if (parsed.type === "bob_searching" && parsed.audio_url) {
              console.log('[useBobChat] Bob searching:', parsed.search_type, parsed.clip_key);
              
              // Queue the audio for sequential playback
              searchingAudioQueueRef.current.push(parsed.audio_url);
              
              // Start playing if not already
              if (!isPlayingSearchingRef.current && !isMuted) {
                playNextSearchingAudio();
              }
              
              // Don't add to message history - this is a transient announcement
              continue;
            }
            
            if (parsed.type === "cart_updated" && parsed.items) {
              onCartUpdated?.(parsed.items);
              continue;
            }
            
            if (parsed.type === "highlight_part" && parsed.partType) {
              onHighlightPart?.(parsed.partType);
              continue;
            }
            
            if (parsed.type === "highlight_product" && parsed.product) {
              onHighlightProduct?.(parsed.product);
              continue;
            }
            
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              let cleanContent = assistantContent.replace(/\[VEHICLE_CONFIRMED:\{[\s\S]*?\}\]/g, '');
              cleanContent = sanitizeContent(cleanContent);
              
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: cleanContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: cleanContent }];
              });
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Stream complete - speak the response
      latestAssistantMessageRef.current = sanitizeContent(
        assistantContent.replace(/\[VEHICLE_CONFIRMED:\{[\s\S]*?\}\]/g, '')
      );
      
      if (!isMuted && latestAssistantMessageRef.current) {
        // Check for audio hint (canned response) - bypass TTS entirely
        if (audioHintUrlRef.current) {
          console.log('[useBobChat] Playing canned audio:', audioHintUrlRef.current);
          const audio = new Audio(audioHintUrlRef.current);
          audio.onplay = () => {
            console.log('[useBobChat] Canned audio STARTED');
            onReadyToSpeak?.();
            if (!manualMode) safeSetState(talkingState);
          };
          audio.onended = () => {
            console.log('[useBobChat] Canned audio ENDED');
            if (!manualMode) {
              if (onStreamComplete) {
                onStreamComplete();
              } else {
                safeSetState(completeState);
                setTimeout(() => safeSetState(listenState), 3000);
              }
            }
          };
          audio.onerror = () => {
            console.error('[useBobChat] Canned audio failed, falling back to TTS');
            speak(latestAssistantMessageRef.current);
          };
          audio.play().catch(() => {
            console.error('[useBobChat] Canned audio autoplay blocked, falling back to TTS');
            speak(latestAssistantMessageRef.current);
          });
          audioHintUrlRef.current = null; // Reset for next message
        } else {
          speak(latestAssistantMessageRef.current);
        }
      }
      
    } catch (error) {
      console.error('[useBobChat] Stream error:', error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry mate, something went wrong. Give it another go?" 
      }]);
    }
  };

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    
    // Retry any pending greeting on user interaction
    retryPendingGreeting();
    stopSpeech();
    
    console.log('[useBobChat] User sent message - switching to RESEARCH state');
    onResearchStart?.();
    if (!manualMode) safeSetState(thinkingState);
    onStreamStart?.();
    
    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    streamChat(userMessage).finally(() => setIsLoading(false));
  }, [input, isLoading, manualMode, thinkingState, onResearchStart, onStreamStart, retryPendingGreeting, stopSpeech]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInputFocus = useCallback(() => {
    // Retry any blocked greeting when user focuses input
    retryPendingGreeting();
    stopSpeech();
  }, [stopSpeech, retryPendingGreeting]);

  const handleInputBlur = useCallback(() => {
    // No-op
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    initialGreetingSentRef.current = false;
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (!prev) stopSpeech();
      return !prev;
    });
  }, [stopSpeech]);

  const clearVehicle = useCallback(() => {
    setIdentifiedVehicle(null);
    autoFetchTriggeredRef.current = false;
  }, []);

  // Send a message directly without relying on input state (for programmatic sends like variant selection)
  // NOTE: Does NOT check isLoading - variant selection must always go through even mid-stream
  const sendDirectMessage = useCallback((content: string) => {
    if (!content.trim()) return;
    
    console.log('[useBobChat] sendDirectMessage:', content);
    // Clear any stale input and force-reset loading state so we never get blocked
    setInput("");
    setIsLoading(false);
    onResearchStart?.();
    if (!manualMode) safeSetState(thinkingState);
    onStreamStart?.();
    
    const userMessage: Message = { role: "user", content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    streamChat(userMessage).finally(() => setIsLoading(false));
  }, [manualMode, thinkingState, onResearchStart, onStreamStart]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    handleSend,
    handleKeyPress,
    handleInputFocus,
    handleInputBlur,
    chatEndRef,
    clearMessages,
    isMuted,
    toggleMute,
    isSpeaking,
    identifiedVehicle,
    clearVehicle,
    stopSpeech,
    sendDirectMessage,
  };
};
