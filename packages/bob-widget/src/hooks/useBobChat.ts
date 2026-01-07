import { useState, useEffect, useRef } from "react";
import { useBobContext } from "../BobProvider";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { useBobAnalytics } from "./useBobAnalytics";
import { BOB_VERSION } from "../version";
import type { Vehicle } from "../types/vehicle";

import type { Message, HighlightedProduct } from "../types/message";

// ============================================================================
// CONTENT SANITIZATION - Remove raw function calls from chat/TTS
// ============================================================================

/**
 * Sanitizes content to remove raw function call patterns that the AI
 * sometimes streams (e.g., "retrieve_parts(vehicleid=17948, part_type='Brake')")
 */
const sanitizeContent = (text: string): string => {
  if (!text) return text;
  
  let sanitized = text;
  
  // Remove function call patterns: function_name(params...)
  // Matches: retrieve_parts(vehicleid=17948, part_type='Brake Pads')
  // Also matches: lookup_vehicle(plate="ABC123")
  // And: search_general_products(query="tire shine")
  sanitized = sanitized.replace(
    /\b(retrieve_parts|lookup_vehicle|search_general_products|retrieve_service_packages|add_to_cart|get_cart|create_checkout|get_customer_context|get_product_details|search_products|check_vehicle_fitment|search_web)\s*\([^)]*\)/gi,
    ''
  );
  
  // Remove JSON-like function arguments that might be split across chunks
  // Matches: (vehicleid=12345, part_type="...")
  sanitized = sanitized.replace(
    /\(\s*(vehicleid|vehicle_id|part_type|query|plate|user_email|sku)\s*=\s*[^)]+\)/gi,
    ''
  );
  
  // Remove any remaining partial function patterns
  // Matches: retrieve_parts( or lookup_vehicle(
  sanitized = sanitized.replace(
    /\b(retrieve_parts|lookup_vehicle|search_general_products|retrieve_service_packages|add_to_cart|get_cart|create_checkout|get_customer_context|get_product_details|search_products|check_vehicle_fitment|search_web)\s*\(/gi,
    ''
  );
  
  // Remove leftover function parameters that might be orphaned
  // Matches: vehicleid=17948, or part_type='Brake Pads'
  sanitized = sanitized.replace(
    /\b(vehicleid|vehicle_id|part_type)\s*=\s*(['"]?[\w\s]+['"]?)\s*,?\s*/gi,
    ''
  );
  
  // Remove markdown code fences that might wrap function calls
  sanitized = sanitized.replace(/```[\s\S]*?```/g, '');
  
  // Clean up excess whitespace and empty parentheses
  sanitized = sanitized.replace(/\(\s*\)/g, '');
  sanitized = sanitized.replace(/\s{2,}/g, ' ');
  sanitized = sanitized.trim();
  
  return sanitized;
};

/**
 * Sanitizes text specifically for TTS - more aggressive cleaning
 */
const sanitizeForTTS = (text: string): string => {
  let sanitized = sanitizeContent(text);
  
  // Additional TTS-specific cleaning
  // Remove any remaining brackets or special characters
  sanitized = sanitized.replace(/[\[\]{}]/g, '');
  
  // Remove URLs
  sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '');
  
  // Remove very technical terms that shouldn't be spoken
  sanitized = sanitized.replace(/\bSKU\s*:?\s*\w+/gi, '');
  
  return sanitized;
};

export type AnimationState = string;

// Keywords that indicate a version query
const VERSION_KEYWORDS = [
  'what version', 'which version', 'software version', 'bob version',
  'your version', 'current version', 'running version', 'version number',
  'what ver', 'which ver'
];

interface UseBobChatProps {
  setAnimationState: (state: AnimationState) => void;
  manualMode?: boolean;
  talkingState?: string;
  thinkingState?: string;
  completeState?: string;
  idleState?: string;
  listenState?: string;
  onStreamStart?: () => void;
  onStreamComplete?: () => void;
  onShowingProduct?: () => void;
  onResearchStart?: () => void;
  onReadyToSpeak?: () => void;
  onHighlightPart?: (partType: string) => void;
  onHighlightProduct?: (product: HighlightedProduct) => void;
  onNoPartsFound?: () => void;
  onAutoFetchComplete?: () => void;
}

// Keywords that indicate Bob is recommending products
const PRODUCT_KEYWORDS = [
  'recommend', 'suggest', 'need', 'part', 'filter', 'brake', 'rotor',
  'oil', 'price', '$', 'stock', 'available', 'pads', 'disc', 'spark plug',
  'battery', 'clutch', 'alternator', 'starter', 'muffler', 'exhaust',
  'service pack', 'add-on', 'tyre shine', 'windscreen wash'
];

// Part type keywords for highlight detection
const PART_TYPE_KEYWORDS = [
  'WIPER BLADE FRONT', 'WIPER BLADE REAR', 'WIPER BLADE SET',
  'BRAKE PAD KIT', 'BRAKE PAD KIT FRONT', 'BRAKE PAD KIT REAR',
  'BRAKE ROTOR', 'BRAKE ROTOR FRONT', 'BRAKE ROTOR REAR', 'BRAKE DISC',
  'AIR FILTER', 'OIL FILTER', 'CABIN FILTER', 'FUEL FILTER',
  'SPARK PLUG SET', 'SPARK PLUG',
  'BALL JOINT', 'TIE ROD END', 'CONTROL ARM',
  'WHEEL BEARING', 'CV JOINT', 'DRIVE SHAFT',
  'TIMING BELT KIT', 'SERPENTINE BELT', 'DRIVE BELT',
  'SHOCK ABSORBER', 'STRUT', 'COIL SPRING',
  'CLUTCH KIT', 'CLUTCH PLATE',
  'ALTERNATOR', 'STARTER MOTOR',
  'WATER PUMP', 'THERMOSTAT',
  'RADIATOR', 'RADIATOR HOSE',
  'EXHAUST', 'MUFFLER', 'CATALYTIC CONVERTER',
  'brake pads', 'brake rotors', 'brake discs', 'brakes',
  'air filter', 'oil filter', 'cabin filter', 'fuel filter',
  'spark plugs', 'spark plug', 'wiper', 'wipers',
  'battery', 'batteries', 'clutch', 'clutch kit',
  'alternator', 'starter motor', 'muffler', 'exhaust',
  'cv joint', 'axle', 'timing belt', 'serpentine belt',
  'shock absorber', 'struts', 'suspension'
];

export const useBobChat = ({ 
  setAnimationState, 
  manualMode = false,
  talkingState = "talk",
  thinkingState = "research",
  completeState = "complete",
  idleState = "idle",
  listenState = "talk_pause",
  onStreamStart,
  onStreamComplete,
  onShowingProduct,
  onResearchStart,
  onReadyToSpeak,
  onHighlightPart,
  onHighlightProduct,
  onNoPartsFound,
  onAutoFetchComplete
}: UseBobChatProps) => {
  const { bobConfig, hostApiConfig, hostContext, callbacks, ga4Config, analyticsEnabled } = useBobContext();
  
  // Initialize analytics
  const analytics = useBobAnalytics({
    ga4Config,
    hostContext,
    callbacks,
    enabled: analyticsEnabled,
  });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [identifiedVehicle, setIdentifiedVehicle] = useState<Vehicle | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoFetchTriggeredRef = useRef(false);
  const initialGreetingSentRef = useRef(false);
  const latestAssistantMessageRef = useRef<string>("");
  const speechStartedRef = useRef(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFallbackTimeout = () => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  };

  const { speak, stop: stopSpeech, isSpeaking } = useSpeechSynthesis({
    onStart: () => {
      clearFallbackTimeout();
      speechStartedRef.current = true;
      console.log('[BobWidget] Speech started - revealing products');
      analytics.trackSpeechPlayed(latestAssistantMessageRef.current.length);
      onReadyToSpeak?.();
      if (!manualMode) {
        safeSetState(talkingState);
      }
    },
    onEnd: () => {
      clearFallbackTimeout();
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
    },
    onFailed: () => {
      console.warn('[BobWidget] Speech synthesis failed - fallback triggered');
      analytics.trackSpeechFailed(latestAssistantMessageRef.current.length);
    }
  });

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync identifiedVehicle from host context
  useEffect(() => {
    const selectedVehicle = hostContext.vehicle?.selectedVehicle;
    if (selectedVehicle && !identifiedVehicle) {
      console.log('[BobWidget] Setting vehicle from host context:', selectedVehicle);
      setIdentifiedVehicle(selectedVehicle as Vehicle);
      callbacks.onVehicleIdentified?.(selectedVehicle as Vehicle);
      analytics.trackVehicleIdentified({
        make: selectedVehicle.make,
        model: selectedVehicle.model,
        year: selectedVehicle.year,
        rego: selectedVehicle.rego,
      });
    }
  }, [hostContext.vehicle?.selectedVehicle]);

  // Send initial greeting with TTS
  useEffect(() => {
    if (messages.length === 0 && !initialGreetingSentRef.current) {
      initialGreetingSentRef.current = true;
      const selectedVehicle = hostContext.vehicle?.selectedVehicle;
      
      let greetingMessage: string;
      if (selectedVehicle) {
        const vehicleName = `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`;
        greetingMessage = `G'day! Saw you've got the ${vehicleName} - choice wagon! What can I help you find for it today?`;
      } else {
        greetingMessage = "G'day! Bob from CARFIX here. How can I help ya today?";
      }
      
      setMessages([{ role: "assistant", content: greetingMessage }]);
      
      // Speak the greeting after a short delay to allow component to mount
      // and avoid browser autoplay restrictions by queuing it
      if (!isMuted) {
        setTimeout(() => {
          console.log('[BobWidget] Speaking initial greeting');
          speak(greetingMessage);
        }, 800);
      }
    }
  }, [hostContext.vehicle?.selectedVehicle, messages.length, isMuted, speak]);

  // Auto-fetch parts when vehicle is provided
  useEffect(() => {
    const selectedVehicle = hostContext.vehicle?.selectedVehicle;
    if (!selectedVehicle || autoFetchTriggeredRef.current) return;

    const rawVehicleId = (selectedVehicle as Vehicle).vehicle_id ?? (selectedVehicle as Vehicle).id;
    const vehicleIdNum = Number.parseInt(String(rawVehicleId), 10);

    if (!Number.isFinite(vehicleIdNum)) {
      console.warn('[BobWidget] Vehicle has invalid vehicle_id, cannot auto-fetch:', selectedVehicle);
      return;
    }

    autoFetchTriggeredRef.current = true;

    const vehicleContext = { ...selectedVehicle, vehicle_id: String(vehicleIdNum) };
    const customerEmail = hostContext.user?.email;

    const fetchPartsForVehicle = async () => {
      const CHAT_URL = `${bobConfig.supabaseUrl}/functions/v1/bob-chat`;

      try {
        const response = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bobConfig.supabaseKey}`,
          },
          body: JSON.stringify({
            messages: [],
            vehicleContext,
            customerEmail,
            autoFetchParts: true,
            hostConfig: hostApiConfig,
            hostContext,
          }),
        });

        if (!response.ok || !response.body) {
          console.error('[BobWidget] Auto-fetch failed:', response.status);
          return;
        }

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

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);

              if (parsed.type === "service_packages_found" && parsed.packages) {
                callbacks.onServicePackagesFound?.(parsed.packages);
              }

              if (parsed.type === "parts_found" && parsed.parts) {
                callbacks.onPartsFound?.(parsed.parts);
                analytics.trackPartsViewed(
                  Array.isArray(parsed.parts) ? parsed.parts.length : 0,
                  String(vehicleIdNum)
                );
              }
            } catch {
              // Ignore parse errors
            }
          }
        }

        onAutoFetchComplete?.();
      } catch (error) {
        console.error('[BobWidget] Auto-fetch error:', error);
      }
    };

    fetchPartsForVehicle();
  }, [hostContext.vehicle?.selectedVehicle, hostContext.user?.email]);

  const safeSetState = (state: AnimationState) => {
    try {
      setAnimationState(state);
    } catch (error) {
      console.warn(`[BobWidget] State "${state}" not available`);
    }
  };

  const streamChat = async (userMessage: Message) => {
    const CHAT_URL = `${bobConfig.supabaseUrl}/functions/v1/bob-chat`;
    const customerEmail = hostContext.user?.email;
    
    try {
      const requestBody: Record<string, unknown> = { 
        messages: [...messages, userMessage],
        hostConfig: hostApiConfig,
        hostContext,
      };
      
      if (identifiedVehicle) {
        requestBody.vehicleContext = identifiedVehicle;
      }
      
      if (customerEmail) {
        requestBody.customerEmail = customerEmail;
      }
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bobConfig.supabaseKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          callbacks.onError?.(new Error("Rate limit exceeded"));
          return;
        }
        if (resp.status === 402) {
          callbacks.onError?.(new Error("Payment required"));
          return;
        }
        throw new Error("Failed to start stream");
      }

      if (!resp.body) throw new Error("No response body");

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

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            
            if (parsed.type === "vehicle_identified" && parsed.vehicle) {
              setIdentifiedVehicle(parsed.vehicle);
              callbacks.onVehicleIdentified?.(parsed.vehicle);
              analytics.trackVehicleIdentified({
                make: parsed.vehicle.make,
                model: parsed.vehicle.model,
                year: parsed.vehicle.year,
                rego: parsed.vehicle.rego,
              });
              continue;
            }
            
            if (parsed.type === "service_packages_found" && parsed.packages) {
              callbacks.onServicePackagesFound?.(parsed.packages);
              continue;
            }
            
            if (parsed.type === "parts_found" && parsed.parts) {
              callbacks.onPartsFound?.(parsed.parts);
              analytics.trackPartsViewed(
                Array.isArray(parsed.parts) ? parsed.parts.length : 0,
                identifiedVehicle?.vehicle_id?.toString()
              );
              continue;
            }
            
            if (parsed.type === "no_parts_found") {
              onNoPartsFound?.();
              continue;
            }
            
            if (parsed.type === "cart_updated" && parsed.items) {
              callbacks.onCartUpdated?.(parsed.items);
              continue;
            }
            
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              // SANITIZE: Remove vehicle markers AND function call patterns
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
              
              callbacks.onBobMessage?.(cleanContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // SANITIZE the final assistant message for storage and TTS
      let finalCleanContent = assistantContent.replace(/\[VEHICLE_CONFIRMED:\{[\s\S]*?\}\]/g, '');
      finalCleanContent = sanitizeContent(finalCleanContent);
      latestAssistantMessageRef.current = finalCleanContent;

      const hasProductContent = PRODUCT_KEYWORDS.some(keyword => 
        assistantContent.toLowerCase().includes(keyword.toLowerCase())
      );
      
      // Detect part type for highlighting
      const lowerContent = assistantContent.toLowerCase();
      for (const partType of PART_TYPE_KEYWORDS) {
        if (lowerContent.includes(partType.toLowerCase())) {
          const normalized = partType.replace(/s\s*$/i, '').toUpperCase();
          onHighlightPart?.(normalized);
          break;
        }
      }
      
      // Detect product recommendation
      const priceMatch = assistantContent.match(/(?:go with|recommend|suggest|grab|try)\s+(?:the\s+)?(\w+)\s+(?:at|for)\s+\$(\d+(?:\.\d{2})?)/i);
      if (priceMatch) {
        const [, brand, price] = priceMatch;
        onHighlightProduct?.({ brand, price: parseFloat(price) });
      }

      // Handle speech - SANITIZE specifically for TTS
      if (!isMuted && latestAssistantMessageRef.current.trim()) {
        speechStartedRef.current = false;
        clearFallbackTimeout();
        
        // Use TTS-specific sanitization for cleaner spoken output
        const ttsText = sanitizeForTTS(latestAssistantMessageRef.current);
        speak(ttsText);
        
        fallbackTimeoutRef.current = setTimeout(() => {
          if (!speechStartedRef.current) {
            console.warn('[BobWidget] Speech fallback after 2s');
            onReadyToSpeak?.();
            
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
        }, 2000);
      } else {
        onReadyToSpeak?.();
        
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
    } catch (error) {
      console.error("[BobWidget] Chat error:", error);
      const errorObj = error instanceof Error ? error : new Error("Unknown error");
      callbacks.onError?.(errorObj);
      analytics.trackError(
        errorObj.name || 'ChatError',
        errorObj.message || 'Unknown chat error'
      );
      if (!manualMode) {
        safeSetState(idleState);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    stopSpeech();

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    
    // Track message sent
    analytics.trackMessageSent(input.length, !!identifiedVehicle);
    
    // Check for version query
    const lowerInput = input.toLowerCase();
    const isVersionQuery = VERSION_KEYWORDS.some(keyword => lowerInput.includes(keyword));
    
    if (isVersionQuery) {
      const versionResponse = `G'day mate! I'm running Bob v${BOB_VERSION} - she's running sweet as! Anything else I can help ya with?`;
      setMessages(prev => [...prev, { role: "assistant", content: versionResponse }]);
      
      if (!isMuted) {
        speak(versionResponse);
      }
      return;
    }
    
    setIsLoading(true);
    
    onResearchStart?.();
    
    if (!manualMode) {
      safeSetState(thinkingState);
    }

    await streamChat(userMessage);
    setIsLoading(false);
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
    if (!isMuted) {
      stopSpeech();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputFocus = () => {};
  const handleInputBlur = () => {};

  const clearMessages = () => {
    setMessages([{
      role: "assistant",
      content: "G'day! Bob from CARFIX here. How can I help ya today?"
    }]);
  };

  const clearVehicle = () => {
    setIdentifiedVehicle(null);
  };

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
    clearVehicle
  };
};
