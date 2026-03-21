import { useState, useEffect, useRef } from "react";
import { useBobContext } from "../BobProvider";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { useBobAnalytics } from "./useBobAnalytics";
import { useReturningUser } from "./useReturningUser";
import { BOB_VERSION } from "../version";
import type { Vehicle } from "../types/vehicle";
import type { VariantCard } from "../components/mobile/MobileProductColumn";

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
  /** When backend requires user to pick a vehicle variant, provide UI-ready cards for the shelf */
  onVariantSelectionRequired?: (variants: VariantCard[], make: string, model: string) => void;
  /** Ref containing current shelf category names for post-stream scroll matching */
  shelfCategoriesRef?: React.RefObject<Set<string>>;
  /** Optional pre-identified vehicle — skips REGO lookup when no session exists */
  initialVehicle?: {
    vehicle_id: string | number;
    make: string;
    model: string;
    year: number;
    [key: string]: unknown;
  };
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
  // v3.1.15: Updated defaults to match V2 Bob animation state keys
  talkingState = "talking",
  thinkingState = "researching",
  completeState = "idle",
  idleState = "idle",
  listenState = "listening",
  onStreamStart,
  onStreamComplete,
  onShowingProduct,
  onResearchStart,
  onReadyToSpeak,
  onHighlightPart,
  onHighlightProduct,
  onNoPartsFound,
  onAutoFetchComplete,
  onVariantSelectionRequired,
  shelfCategoriesRef,
  initialVehicle
}: UseBobChatProps) => {
  const { bobConfig, hostApiConfig, hostContext, callbacks, ga4Config, analyticsEnabled } = useBobContext();
  
  // Initialize analytics
  const analytics = useBobAnalytics({
    ga4Config,
    hostContext,
    callbacks,
    enabled: analyticsEnabled,
  });
  
  // Detect returning users for personalized greetings
  const { isReturningUser } = useReturningUser();
  
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
  const audioHintUrlRef = useRef<string | null>(null);
  
  // ============= SESSION PERSISTENCE =============
  const BOB_SESSION_KEY = 'carfix_bob_session';
  const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
  const sessionRestoredRef = useRef(false);
  
  const saveSession = (msgs?: Message[]) => {
    try {
      const data = {
        messages: msgs ?? messages,
        vehicleCandidates: vehicleCandidatesRef.current,
        conversationState: conversationStateRef.current,
        savedAt: Date.now(),
      };
      sessionStorage.setItem(BOB_SESSION_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[BobWidget] Failed to save session:', e);
    }
  };
  
  // ============= GLOBAL AUDIO CONTROLLER =============
  // Priority order: canned > searching > tts
  // Prevents audio overlap by tracking current source and state
  interface AudioControllerState {
    source: 'none' | 'searching' | 'canned' | 'tts';
    isPlaying: boolean;
    hasCannedAudio: boolean;
    cannedUrl: string | null;
    currentAudio: HTMLAudioElement | null;
    searchingQueue: string[];
  }
  
  const audioControllerRef = useRef<AudioControllerState>({
    source: 'none',
    isPlaying: false,
    hasCannedAudio: false,
    cannedUrl: null,
    currentAudio: null,
    searchingQueue: [],
  });
  
  // NEW: Vehicle candidates for multi-variant selection persistence
  const vehicleCandidatesRef = useRef<unknown[]>([]);
  
  // NEW: Conversation state for UI hints
  const conversationStateRef = useRef<string>('AWAITING_REGO');
  
  // Track canned/searching audio playing state (separate from TTS isSpeaking)
  const [isAudioControllerPlaying, setIsAudioControllerPlaying] = useState(false);
  
  // Helper: Stop all audio and reset controller
  const stopAllAudio = () => {
    const controller = audioControllerRef.current;
    if (controller.currentAudio) {
      try {
        controller.currentAudio.pause();
        controller.currentAudio.currentTime = 0;
      } catch (e) {
        console.warn('[BobWidget] Error stopping audio:', e);
      }
      controller.currentAudio = null;
    }
    controller.isPlaying = false;
    controller.source = 'none';
    controller.searchingQueue = [];
    setIsAudioControllerPlaying(false);
    stopSpeech(); // Also stop TTS
  };
  
  // Helper: Play audio with tracking
  const playControlledAudio = (url: string, source: 'searching' | 'canned', onComplete?: () => void) => {
    const controller = audioControllerRef.current;
    
    // Stop any current audio if this is higher priority
    if (controller.isPlaying) {
      if (source === 'canned' || (source === 'searching' && controller.source === 'tts')) {
        stopAllAudio();
      } else if (controller.source === 'canned') {
        // Don't interrupt canned audio with searching
        console.log('[BobWidget Audio] Skipping lower priority audio while canned is playing');
        return;
      }
    }
    
    const audio = new Audio(url);
    controller.currentAudio = audio;
    controller.source = source;
    controller.isPlaying = true;
    
    audio.onplay = () => {
      console.log(`[BobWidget Audio] ${source} STARTED:`, url.split('/').pop());
      setIsAudioControllerPlaying(true);
      if (!manualMode) safeSetState(talkingState);
    };
    
    audio.onended = () => {
      console.log(`[BobWidget Audio] ${source} ENDED`);
      controller.currentAudio = null;
      controller.isPlaying = false;
      controller.source = 'none';
      setIsAudioControllerPlaying(false);
      onComplete?.();
    };
    
    audio.onerror = () => {
      console.warn(`[BobWidget Audio] ${source} FAILED:`, url);
      controller.currentAudio = null;
      controller.isPlaying = false;
      controller.source = 'none';
      setIsAudioControllerPlaying(false);
      onComplete?.();
    };
    
    audio.play().catch((err) => {
      console.warn(`[BobWidget Audio] ${source} autoplay blocked:`, err);
      controller.currentAudio = null;
      controller.isPlaying = false;
      controller.source = 'none';
      onComplete?.();
    });
  };
  
  // Sequential audio player for searching events
  const playNextSearchingAudio = () => {
    const controller = audioControllerRef.current;
    
    // Don't play searching audio if canned audio is pending or playing
    if (controller.hasCannedAudio || controller.source === 'canned') {
      console.log('[BobWidget Audio] Skipping searching audio - canned audio takes priority');
      controller.searchingQueue = [];
      return;
    }
    
    if (controller.searchingQueue.length === 0) {
      if (!manualMode && controller.source === 'searching') {
        safeSetState(thinkingState);
      }
      return;
    }
    
    const url = controller.searchingQueue.shift()!;
    playControlledAudio(url, 'searching', () => {
      playNextSearchingAudio();
    });
  };

  const clearFallbackTimeout = () => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  };

  const { speak, stop: stopSpeech, isSpeaking, retryPendingGreeting } = useSpeechSynthesis({
    onStart: () => {
      clearFallbackTimeout();
      speechStartedRef.current = true;
      console.log('[BobWidget STATE] Speech STARTED - transitioning to TALK state');
      analytics.trackSpeechPlayed(latestAssistantMessageRef.current.length);
      onReadyToSpeak?.();
      // EXPLICIT: Force talk animation when speech starts
      if (!manualMode) {
        console.log('[BobWidget STATE] Setting state to:', talkingState);
        safeSetState(talkingState);
      }
    },
    onEnd: () => {
      clearFallbackTimeout();
      console.log('[BobWidget STATE] Speech ENDED - transitioning out of TALK state');
      
      const hasProductContent = PRODUCT_KEYWORDS.some(keyword => 
        latestAssistantMessageRef.current.toLowerCase().includes(keyword.toLowerCase())
      );

      // EXPLICIT: Force OUT of talk state when speech ends
      if (!manualMode) {
        if (hasProductContent && onShowingProduct) {
          console.log('[BobWidget STATE] Has products - calling onShowingProduct');
          onShowingProduct();
        } else if (onStreamComplete) {
          console.log('[BobWidget STATE] Calling onStreamComplete');
          onStreamComplete();
        } else {
          console.log('[BobWidget STATE] Setting state to:', completeState);
          safeSetState(completeState);
          // Transition to listen after delay - guard against re-speaking
          setTimeout(() => {
            console.log('[BobWidget STATE] Post-complete transition to:', listenState);
            safeSetState(listenState);
          }, 2000);
        }
      }
    },
    onFailed: () => {
      console.warn('[BobWidget] Speech synthesis failed - fallback triggered');
      analytics.trackSpeechFailed(latestAssistantMessageRef.current.length);
    }
  });

  // Expose stopAllAudio to host via BobCallbacks.onStopSpeechReady
  // Bug #2 fix: passes stopAllAudio (TTS + canned + searching) instead of just stopSpeech
  useEffect(() => {
    callbacks.onStopSpeechReady?.(stopAllAudio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      
      // Returning user gets a casual, familiar greeting
      if (isReturningUser) {
        greetingMessage = "Ah hey... you again! What you after this time?";
        console.log('[BobWidget] Using returning user greeting');
      } else if (selectedVehicle) {
        const vehicleName = `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`;
        greetingMessage = `G'day! Saw you've got the ${vehicleName} - choice wagon! What can I help you find for it today?`;
      } else {
        greetingMessage = "G'day! Bob from CARFIX here. How can I help ya today?";
      }
      
      setMessages([{ role: "assistant", content: greetingMessage }]);
      
      // Speak the greeting after a short delay - mark as priority greeting
      if (!isMuted) {
        setTimeout(() => {
          console.log('[BobWidget] Speaking initial greeting (priority)');
          speak(greetingMessage, true); // true = isGreeting priority
        }, 500);
      }
    }
  }, [hostContext.vehicle?.selectedVehicle, messages.length, isMuted, speak]);

  // Retry pending greeting on first user interaction (click/touch)
  useEffect(() => {
    const handleFirstInteraction = () => {
      console.log('[BobWidget] User interaction detected - retrying pending greeting');
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
                console.log('[useBobChat autoFetch] Received service_packages_found:', parsed.packages.length, 'packages');
                callbacks.onServicePackagesFound?.(parsed.packages);
                // v3.2.11: Eagerly populate shelfCategoriesRef for scroll matching
                if (shelfCategoriesRef?.current) {
                  (parsed.packages as Array<{ title?: string }>).forEach((pkg) => {
                    if (pkg.title) shelfCategoriesRef.current!.add(pkg.title);
                  });
                }
              }

              if (parsed.type === "parts_found" && parsed.parts) {
                console.log('[useBobChat autoFetch] Received parts_found:', parsed.parts.length, 'parts');
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

  // OLD sequential player removed - using global audio controller above

  const streamChat = async (userMessage: Message) => {
    const CHAT_URL = `${bobConfig.supabaseUrl}/functions/v1/bob-chat`;
    const customerEmail = hostContext.user?.email;
    
    // v3.2.8: Removed optimistic searching audio — canned audio disabled in Bob V2.0
    // v3.2.9: Track whether server sent highlight_category during this stream
    let highlightCategoryReceived = false;
    
    try {
      const requestBody: Record<string, unknown> = { 
        messages: [...messages, userMessage],
        hostConfig: hostApiConfig,
        hostContext,
      };
      
      // v3.2.12: Send compact shelf context so follow-up bypass has real product data
      if (shelfCategoriesRef?.current && shelfCategoriesRef.current.size > 0) {
        requestBody.shelfContext = Array.from(shelfCategoriesRef.current).join(', ');
      }
      
      if (identifiedVehicle) {
        requestBody.vehicleContext = identifiedVehicle;
      }
      
      if (customerEmail) {
        requestBody.customerEmail = customerEmail;
      }
      
      // DEBUG: Log vehicle candidates state BEFORE building request
      console.log('[useBobChat DEBUG] vehicleCandidatesRef.current:', 
        JSON.stringify(vehicleCandidatesRef.current?.slice(0, 2)));
      console.log('[useBobChat DEBUG] vehicleCandidatesRef.current.length:', vehicleCandidatesRef.current?.length);
      console.log('[useBobChat DEBUG] conversationStateRef.current:', conversationStateRef.current);
      
      // NEW: Include stored vehicle candidates for deterministic variant selection
      if (vehicleCandidatesRef.current && vehicleCandidatesRef.current.length > 0) {
        requestBody.vehicleCandidates = vehicleCandidatesRef.current;
        console.log('[useBobChat] ✅ Including', vehicleCandidatesRef.current.length, 'vehicle candidates in request');
      } else {
        console.log('[useBobChat] ⚠️ No vehicle candidates to include - ref is empty');
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
            
            // NEW: Handle conversation_state event for UI sync
            if (parsed.type === "conversation_state") {
              console.log('[useBobChat] 🔄 conversation_state event received:', parsed.state);
              conversationStateRef.current = parsed.state;
              // Store candidates if provided
              if (parsed.candidates && Array.isArray(parsed.candidates)) {
                vehicleCandidatesRef.current = parsed.candidates;
                console.log('[useBobChat] ✅ Stored', parsed.candidates.length, 'vehicle candidates from state event');
                console.log('[useBobChat] First candidate:', JSON.stringify(parsed.candidates[0]));
              } else {
                console.log('[useBobChat] ⚠️ conversation_state had no candidates array');
              }
              continue;
            }

            // NEW: Handle variant selection UI cards for shelf rendering
            if (parsed.type === "variant_selection_required") {
              const count = Array.isArray(parsed.candidates) ? parsed.candidates.length : 0;
              console.log('[useBobChat] 🎴 variant_selection_required event received:', count, 'cards');

              if (Array.isArray(parsed.candidates)) {
                onVariantSelectionRequired?.(
                  parsed.candidates as VariantCard[],
                  typeof parsed.make === 'string' ? parsed.make : '',
                  typeof parsed.model === 'string' ? parsed.model : ''
                );
              } else {
                console.warn('[useBobChat] ⚠️ variant_selection_required had no candidates array');
              }
              continue;
            }
            
            if (parsed.type === "vehicle_identified" && parsed.vehicle) {
              setIdentifiedVehicle(parsed.vehicle);
              // Clear candidates when vehicle is confirmed
              vehicleCandidatesRef.current = [];
              conversationStateRef.current = 'VEHICLE_CONFIRMED';
              callbacks.onVehicleIdentified?.(parsed.vehicle);
              analytics.trackVehicleIdentified({
                make: parsed.vehicle.make,
                model: parsed.vehicle.model,
                year: parsed.vehicle.year,
                rego: parsed.vehicle.rego,
              });
              continue;
            }
            
            // Handle vehicle candidates for multi-variant selection
            if (parsed.type === "vehicle_candidates_found" && parsed.candidates) {
              console.log('[useBobChat] 📦 vehicle_candidates_found event received:', parsed.candidates.length, 'candidates');
              vehicleCandidatesRef.current = parsed.candidates;
              console.log('[useBobChat] ✅ Candidates stored in ref. First:', JSON.stringify(parsed.candidates[0]));
              continue;
            }
            
            if (parsed.type === "service_packages_found" && parsed.packages) {
              callbacks.onServicePackagesFound?.(parsed.packages);
              // v3.2.11: Eagerly populate shelfCategoriesRef so post-stream scroll matching works
              if (shelfCategoriesRef?.current) {
                (parsed.packages as Array<{ title?: string }>).forEach((pkg) => {
                  if (pkg.title) shelfCategoriesRef.current!.add(pkg.title);
                });
                console.log('[useBobChat] Eagerly added service package titles to shelfCategories:', Array.from(shelfCategoriesRef.current));
              }
              continue;
            }
            
            if (parsed.type === "parts_found" && parsed.parts) {
              console.log('[useBobChat] Received parts_found event:', parsed.parts.length, 'parts');
              callbacks.onPartsFound?.(parsed.parts);
              // v3.2.11: Eagerly add partslot categories to shelfCategoriesRef
              if (shelfCategoriesRef?.current && Array.isArray(parsed.parts)) {
                (parsed.parts as Array<{ partslot_description?: string }>).forEach((p) => {
                  const cat = p.partslot_description || 'Other Parts';
                  if (cat) shelfCategoriesRef.current!.add(cat);
                });
              }
              analytics.trackPartsViewed(
                Array.isArray(parsed.parts) ? parsed.parts.length : 0,
                identifiedVehicle?.vehicle_id?.toString()
              );
              continue;
            }
            
            // Handle bob_suggestions event - attach products to current assistant message for inline display
            if (parsed.type === "bob_suggestions" && parsed.products) {
              console.log('[useBobChat] Received bob_suggestions:', parsed.products.length, 'products', parsed.title);
              
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                console.log('[useBobChat] Attaching to message:', lastMsg?.role, lastMsg?.content?.slice(0, 40));
                
                if (lastMsg?.role === "assistant") {
                  return updated.map((m, i) => 
                    i === updated.length - 1 
                      ? { 
                          ...m, 
                          suggestedProducts: parsed.products,
                          suggestionsTitle: parsed.title 
                        } 
                      : m
                  );
                }
                return updated;
              });
              
              // NOTE: Do NOT call onPartsFound here - let parts_found event handle full catalog
              // bob_suggestions is for inline display only, not shelf population
              console.log('[useBobChat] bob_suggestions processed for inline display only');
              continue;
            }
            
            if (parsed.type === "no_parts_found") {
              // Clear products and service packages when no results found
              callbacks.onPartsFound?.([]);
              callbacks.onServicePackagesFound?.([]);
              onNoPartsFound?.();
              continue;
            }

            // Handle Brain diagnostic category highlight — scroll shelf to matched category
            if (parsed.type === "highlight_category" && parsed.category) {
              console.log('[useBobChat] highlight_category event:', parsed.category);
              highlightCategoryReceived = true;
              onHighlightPart?.(parsed.category);
              continue;
            }

            // Handle navigate_url - stop speech and fire host navigation callback immediately
            if (parsed.type === "navigate_url" && parsed.url) {
              console.log('[useBobChat] navigate_url event:', parsed.url);
              stopSpeech();
              callbacks.onNavigateToProductPage?.({ sku: parsed.sku, url: parsed.url } as any);
              continue;
            }

            // Handle quick_replies - attach navigation CTA buttons to the last assistant message
            if (parsed.type === "quick_replies" && Array.isArray(parsed.replies)) {
              console.log('[useBobChat] quick_replies event:', parsed.replies.length, 'buttons');
              setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (updated[lastIdx]?.role === "assistant") {
                  return updated.map((m, i) =>
                    i === lastIdx ? { ...m, quickReplies: parsed.replies } : m
                  );
                }
                return updated;
              });
              continue;
            }
            
            // Handle audio_hint for canned responses - bypass TTS entirely
            if (parsed.type === "audio_hint" && parsed.audio_url) {
              console.log('[useBobChat] Audio hint received:', parsed.clip_key, parsed.audio_url);
              // CRITICAL: Mark that we have canned audio - this prevents TTS from playing
              const controller = audioControllerRef.current;
              controller.hasCannedAudio = true;
              controller.cannedUrl = parsed.audio_url;
              // Stop any searching audio since canned takes priority
              stopAllAudio();
              continue;
            }
            
            // Handle bob_searching event - play audio AND show transcript so text matches voice
            if (parsed.type === "bob_searching" && parsed.audio_url) {
              console.log('[useBobChat] Bob searching:', parsed.search_type, parsed.clip_key);
              
              // ✅ ADD transcript to chat messages so text matches voice
              if (parsed.transcript) {
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  // Only add if not already the last message (prevent duplicates)
                  if (last?.role !== "assistant" || last?.content !== parsed.transcript) {
                    return [...prev, { role: "assistant", content: parsed.transcript }];
                  }
                  return prev;
                });
              }
              
              // Queue the audio using global audio controller
              const controller = audioControllerRef.current;
              controller.searchingQueue.push(parsed.audio_url);
              
              // Start playing if not already and canned audio isn't pending
              if (!controller.isPlaying && !controller.hasCannedAudio && !isMuted) {
                playNextSearchingAudio();
              }
              
              continue;
            }
            
            if (parsed.type === "cart_updated" && parsed.items) {
              // Fire onCartUpdated with full items array
              callbacks.onCartUpdated?.(parsed.items);
              // Also fire onAddToCart for each item so host handles server-initiated adds
              // the same way as manual UI clicks
              if (callbacks.onAddToCart) {
                for (const item of parsed.items) {
                  callbacks.onAddToCart({
                    product_id: item.product_id || item.productName || '',
                    product_name: item.product_name || item.productName || '',
                    quantity: item.quantity || 1,
                    unit_price: item.unit_price || 0,
                    vehicle_id: item.vehicle_id,
                    sku: item.sku,
                    brand: item.brand,
                  });
                }
              }
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

      // v3.2.9: Post-stream shelf category matching fallback
      // If the server didn't send highlight_category, match Bob's response against actual shelf contents
      console.log('[useBobChat] v3.2.10 scroll debug: highlightCategoryReceived=', highlightCategoryReceived, 'shelfCategories=', shelfCategoriesRef?.current ? Array.from(shelfCategoriesRef.current) : 'none');
      if (!highlightCategoryReceived && shelfCategoriesRef?.current && shelfCategoriesRef.current.size > 0) {
        const responseLower = finalCleanContent.toLowerCase();
        let bestMatch: string | null = null;
        let bestScore = 0;

        for (const category of shelfCategoriesRef.current) {
          const words = category.toLowerCase().split(/\s+/).filter(Boolean);
          const hits = words.filter(w => responseLower.includes(w)).length;
          if (hits === words.length && hits > bestScore) {
            bestScore = hits;
            bestMatch = category;
          }
        }

        if (bestMatch) {
          console.log('[useBobChat] v3.2.10 shelf category match:', bestMatch, `(${bestScore} words)`);
          onHighlightPart?.(bestMatch);
        }
      }
      
      
      // Detect product recommendation
      const priceMatch = assistantContent.match(/(?:go with|recommend|suggest|grab|try)\s+(?:the\s+)?(\w+)\s+(?:at|for)\s+\$(\d+(?:\.\d{2})?)/i);
      if (priceMatch) {
        const [, brand, price] = priceMatch;
        onHighlightProduct?.({ brand, price: parseFloat(price) });
      }

      // Handle speech - SANITIZE specifically for TTS
      // Use global audio controller to prevent overlap
      const audioController = audioControllerRef.current;
      
      if (!isMuted && latestAssistantMessageRef.current.trim()) {
        speechStartedRef.current = false;
        clearFallbackTimeout();
        
        // Check if canned audio is queued (has priority over TTS)
        if (audioController.hasCannedAudio && audioController.cannedUrl) {
          console.log('[BobWidget] Playing canned audio (priority):', audioController.cannedUrl);
          
          // Stop any searching audio
          stopAllAudio();
          
          playControlledAudio(audioController.cannedUrl, 'canned', () => {
            // Reset canned audio state
            audioController.hasCannedAudio = false;
            audioController.cannedUrl = null;
            
            clearFallbackTimeout();
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
          });
          
          // Mark speech as started for the fallback
          speechStartedRef.current = true;
          onReadyToSpeak?.();
          
        } else if (!audioController.isPlaying) {
          // Only use TTS if no audio is currently playing
          const ttsText = sanitizeForTTS(latestAssistantMessageRef.current);
          console.log('[BobWidget] Playing TTS (no canned audio)');
          speak(ttsText);
        } else {
          // Audio is playing - skip TTS
          console.log('[BobWidget] Skipping TTS - audio already playing:', audioController.source);
        }
        
        fallbackTimeoutRef.current = setTimeout(() => {
          if (!speechStartedRef.current) {
            console.warn('[BobWidget] Speech fallback after 5s');
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
        }, 5000);
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

    // Retry any pending greeting on first user interaction
    retryPendingGreeting();
    
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
    
    // EXPLICIT: Trigger research animation BEFORE calling API
    console.log('[BobWidget STATE] User sent message - switching to RESEARCH state:', thinkingState);
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

  const handleInputFocus = () => {
    // Retry any blocked greeting when user focuses input
    retryPendingGreeting();
  };
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

  // Send a message directly without relying on input state.
  // Does NOT check isLoading - used for programmatic sends like variant selection
  // that must go through even while Bob is mid-stream or mid-speech.
  const sendDirectMessage = (content: string) => {
    if (!content.trim()) return;

    console.log('[BobWidget] sendDirectMessage:', content);

    // Stop any ongoing speech immediately
    stopSpeech();

    // Force-clear loading state so streamChat is not blocked
    setIsLoading(false);
    setInput("");

    const userMessage: Message = { role: "user", content };
    setMessages(prev => [...prev, userMessage]);

    onResearchStart?.();
    if (!manualMode) safeSetState(thinkingState);

    setIsLoading(true);
    streamChat(userMessage).finally(() => setIsLoading(false));
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
    // Bug #3 fix: composite isSpeaking — true when EITHER TTS or canned/searching audio is playing
    isSpeaking: isSpeaking || isAudioControllerPlaying,
    identifiedVehicle,
    clearVehicle,
    sendDirectMessage,
    stopAllAudio,
  };
};
