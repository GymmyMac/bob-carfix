import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { Vehicle } from "@/types/vehicle";
import { APIPart } from "@/types/product";

export type AnimationState = string;

export interface Message {
  role: "user" | "assistant";
  content: string;
}

import { ServicePackage } from "@/types/servicePackage";

export interface HighlightedProduct {
  brand: string;
  price: number;
}

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
  onVehicleIdentified?: (vehicle: Vehicle) => void;
  onMultipleVehiclesFound?: () => void;
  onPartsFound?: (parts: APIPart[]) => void;
  onServicePackagesFound?: (packages: ServicePackage[]) => void;
  onResearchStart?: () => void;
  onReadyToSpeak?: () => void;
  onHighlightPart?: (partType: string) => void;
  onHighlightProduct?: (product: HighlightedProduct) => void;
  onNoPartsFound?: () => void;
  // Session handoff props
  initialVehicle?: Vehicle;
  customerEmail?: string;
  // Callback for when auto-fetch completes
  onAutoFetchComplete?: () => void;
}

// Keywords that indicate Bob is recommending products
const PRODUCT_KEYWORDS = [
  'recommend', 'suggest', 'need', 'part', 'filter', 'brake', 'rotor',
  'oil', 'price', '$', 'stock', 'available', 'pads', 'disc', 'spark plug',
  'battery', 'clutch', 'alternator', 'starter', 'muffler', 'exhaust',
  'service pack', 'add-on', 'tyre shine', 'windscreen wash'
];

// Part type keywords for highlight detection - includes exact partslot category names
const PART_TYPE_KEYWORDS = [
  // Exact partslot category names (uppercase matches from CARFIX database)
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
  // Lowercase variations for flexible matching
  'brake pads', 'brake rotors', 'brake discs', 'brakes',
  'air filter', 'oil filter', 'cabin filter', 'fuel filter',
  'spark plugs', 'spark plug', 'wiper', 'wipers',
  'battery', 'batteries',
  'clutch', 'clutch kit',
  'alternator', 'starter motor',
  'muffler', 'exhaust',
  'cv joint', 'axle',
  'timing belt', 'serpentine belt',
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
  onVehicleIdentified,
  onMultipleVehiclesFound,
  onPartsFound,
  onServicePackagesFound,
  onResearchStart,
  onReadyToSpeak,
  onHighlightPart,
  onHighlightProduct,
  onNoPartsFound,
  initialVehicle,
  customerEmail,
  onAutoFetchComplete
}: UseBobChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [identifiedVehicle, setIdentifiedVehicle] = useState<Vehicle | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoFetchTriggeredRef = useRef(false);
  const initialGreetingSentRef = useRef(false);
  const lastContentTimeRef = useRef<number>(0);
  const latestAssistantMessageRef = useRef<string>("");

  // Speech synthesis for Bob's voice
  const { speak, stop: stopSpeech, isSpeaking } = useSpeechSynthesis({
    onStart: () => {
      // Trigger ready to speak - reveals products synchronized with speech
      onReadyToSpeak?.();
      // Keep Bob in talking state while speaking
      if (!manualMode) {
        safeSetState(talkingState);
      }
    },
    onEnd: () => {
      // Check if the spoken content had product keywords
      const hasProductContent = PRODUCT_KEYWORDS.some(keyword => 
        latestAssistantMessageRef.current.toLowerCase().includes(keyword.toLowerCase())
      );

      // Transition based on content type
      if (!manualMode) {
        if (hasProductContent && onShowingProduct) {
          onShowingProduct();
        } else if (onStreamComplete) {
          onStreamComplete();
        } else {
          safeSetState(completeState);
          // Go to listen state, not idle - idle is triggered by useBobStateTransitions after 60s
          setTimeout(() => safeSetState(listenState), 3000);
        }
      }
    }
  });

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sync identifiedVehicle when initialVehicle arrives from session
  useEffect(() => {
    if (initialVehicle && !identifiedVehicle) {
      console.log('Setting identified vehicle from session:', initialVehicle);
      setIdentifiedVehicle(initialVehicle);
      onVehicleIdentified?.(initialVehicle);
    }
  }, [initialVehicle]);

  // Send initial greeting - update when session vehicle arrives
  useEffect(() => {
    // Default greeting if no vehicle
    if (messages.length === 0 && !initialGreetingSentRef.current) {
      setMessages([{
        role: "assistant",
        content: "G'day! Bob from CARFIX here. How can I help ya today?"
      }]);
    }
    
    // Update greeting when vehicle arrives from session (replaces default)
    if (initialVehicle && !initialGreetingSentRef.current) {
      initialGreetingSentRef.current = true;
      const vehicleName = `${initialVehicle.year} ${initialVehicle.make} ${initialVehicle.model}`;
      console.log('Updating greeting for session vehicle:', vehicleName);
      setMessages([{
        role: "assistant",
        content: `G'day! Saw you've got the ${vehicleName} - choice wagon! What can I help you find for it today?`
      }]);
    }
  }, [initialVehicle, messages.length]);

  // Auto-fetch parts and service packages when session vehicle is provided
  useEffect(() => {
    if (!initialVehicle || autoFetchTriggeredRef.current) return;

    const rawVehicleId = initialVehicle.vehicle_id ?? initialVehicle.id;
    const vehicleIdNum = Number.parseInt(String(rawVehicleId), 10);

    if (!Number.isFinite(vehicleIdNum)) {
      console.warn('Session vehicle has invalid vehicle_id, cannot auto-fetch parts:', initialVehicle);
      return;
    }

    autoFetchTriggeredRef.current = true;

    // Normalize vehicleContext so backend always sees a usable vehicle_id
    const vehicleContext = { ...initialVehicle, vehicle_id: String(vehicleIdNum) };

    const fetchPartsForVehicle = async () => {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bob-chat`;

      try {
        const response = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [],
            vehicleContext,
            customerEmail,
            autoFetchParts: true,
          }),
        });

        if (!response.ok || !response.body) {
          console.error('Auto-fetch failed:', response.status, await response.text());
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
            if (jsonStr === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);

              if (parsed.type === "service_packages_found" && parsed.packages) {
                onServicePackagesFound?.(parsed.packages);
              }

              if (parsed.type === "parts_found" && parsed.parts) {
                onPartsFound?.(parsed.parts);
              }

              if (parsed.type === "error") {
                console.error('Auto-fetch error from server:', parsed.message);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }

        onAutoFetchComplete?.();
      } catch (error) {
        console.error('Auto-fetch error:', error);
      }
    };

    fetchPartsForVehicle();
  }, [initialVehicle, customerEmail]);


  const safeSetState = (state: AnimationState) => {
    try {
      setAnimationState(state);
    } catch (error) {
      console.warn(`State "${state}" not available, staying in current state`);
    }
  };

  const streamChat = async (userMessage: Message) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bob-chat`;
    
    try {
      // Build request body with optional vehicle context from session
      const requestBody: Record<string, unknown> = { 
        messages: [...messages, userMessage] 
      };
      
      // Include vehicle context if we have one (from session or identified during chat)
      if (identifiedVehicle) {
        requestBody.vehicleContext = identifiedVehicle;
      }
      
      // Include customer email if available from session
      if (customerEmail) {
        requestBody.customerEmail = customerEmail;
      }
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
          return;
        }
        if (resp.status === 402) {
          toast.error("Payment required. Please add credits to your workspace.");
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

      // Stay in thinking state during text streaming
      // Talking animation will be triggered by useSpeechSynthesis.onStart
      // when audio actually begins playing

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
            
            // Check for vehicle_identified event
            if (parsed.type === "vehicle_identified" && parsed.vehicle) {
              console.log("Vehicle identified:", parsed.vehicle);
              setIdentifiedVehicle(parsed.vehicle);
              onVehicleIdentified?.(parsed.vehicle);
              continue;
            }
            
            // Check for service_packages_found event
            if (parsed.type === "service_packages_found" && parsed.packages) {
              console.log("Service packages found:", parsed.packages.length, "packages");
              onServicePackagesFound?.(parsed.packages);
              continue;
            }
            
            // Check for parts_found event
            if (parsed.type === "parts_found" && parsed.parts) {
              console.log("Parts found:", parsed.parts.length, "parts");
              onPartsFound?.(parsed.parts);
              continue;
            }
            
            // Check for no_parts_found event
            if (parsed.type === "no_parts_found") {
              console.log("No parts found for this request");
              onNoPartsFound?.();
              continue;
            }
            
            // Check for multiple_vehicles_found event (show placeholders)
            if (parsed.type === "multiple_vehicles_found") {
              console.log("Multiple vehicles found - showing placeholders");
              onMultipleVehiclesFound?.();
              continue;
            }
            
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              
              // Strip any vehicle marker that slipped through (client-side fallback)
              const cleanAssistantContent = assistantContent.replace(/\[VEHICLE_CONFIRMED:\{[\s\S]*?\}\]/g, '');
              
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: cleanAssistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: cleanAssistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Store latest assistant message for speech (stripped of markers)
      latestAssistantMessageRef.current = assistantContent.replace(/\[VEHICLE_CONFIRMED:\{[\s\S]*?\}\]/g, '');

      // Check if response contains product recommendations
      const hasProductContent = PRODUCT_KEYWORDS.some(keyword => 
        assistantContent.toLowerCase().includes(keyword.toLowerCase())
      );
      
      // Detect and emit highlighted part type for shelf navigation
      const lowerContent = assistantContent.toLowerCase();
      for (const partType of PART_TYPE_KEYWORDS) {
        if (lowerContent.includes(partType.toLowerCase())) {
          onHighlightPart?.(partType);
          break; // Only highlight one part type at a time
        }
      }
      
      // Detect specific product recommendation (brand + price pattern)
      // Matches: "go with the TRICO at $69", "recommend the BOSCH at $45.99"
      const priceMatch = assistantContent.match(/(?:go with|recommend|suggest|grab|try)\s+(?:the\s+)?(\w+)\s+(?:at|for)\s+\$(\d+(?:\.\d{2})?)/i);
      if (priceMatch) {
        const [, brand, price] = priceMatch;
        onHighlightProduct?.({ brand, price: parseFloat(price) });
      }

      // Speak the response if not muted (use cleaned content)
      if (!isMuted && latestAssistantMessageRef.current.trim()) {
        speak(latestAssistantMessageRef.current);
      } else {
        // If muted or empty message, still trigger ready to speak to reveal products
        onReadyToSpeak?.();
        
        if (!manualMode) {
          // Trigger appropriate animation based on content
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
      console.error("Chat error:", error);
      toast.error("Failed to send message. Please try again.");
      if (!manualMode) {
        safeSetState(idleState);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Stop any ongoing speech when user sends new message
    stopSpeech();

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    // Notify that research is starting (shows loading in product shelf)
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
      // If muting, stop current speech
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
    // No state change on focus - stay in current state
  };

  const handleInputBlur = () => {
    // No state change on blur - stay in current state
  };

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
