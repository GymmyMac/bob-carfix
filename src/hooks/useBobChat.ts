import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSpeechSynthesis } from "./useSpeechSynthesis";

export type AnimationState = string;

export interface Message {
  role: "user" | "assistant";
  content: string;
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
}

// Keywords that indicate Bob is recommending products
const PRODUCT_KEYWORDS = [
  'recommend', 'suggest', 'need', 'part', 'filter', 'brake', 'rotor',
  'oil', 'price', '$', 'stock', 'available', 'pads', 'disc', 'spark plug',
  'battery', 'clutch', 'alternator', 'starter', 'muffler', 'exhaust',
  'service pack', 'add-on', 'tyre shine', 'windscreen wash'
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
  onShowingProduct
}: UseBobChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastContentTimeRef = useRef<number>(0);
  const latestAssistantMessageRef = useRef<string>("");

  // Speech synthesis for Bob's voice
  const { speak, stop: stopSpeech, isSpeaking } = useSpeechSynthesis({
    onStart: () => {
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

  // Send initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "G'day! Bob from CARFIX here. How can I help ya today?"
      }]);
    }
  }, []);

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
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
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
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Store latest assistant message for speech
      latestAssistantMessageRef.current = assistantContent;

      // Check if response contains product recommendations
      const hasProductContent = PRODUCT_KEYWORDS.some(keyword => 
        assistantContent.toLowerCase().includes(keyword.toLowerCase())
      );

      // Speak the response if not muted
      if (!isMuted && assistantContent.trim()) {
        speak(assistantContent);
      } else if (!manualMode) {
        // If muted, trigger appropriate animation based on content
        if (hasProductContent && onShowingProduct) {
          onShowingProduct();
        } else if (onStreamComplete) {
          onStreamComplete();
        } else {
          safeSetState(completeState);
          setTimeout(() => safeSetState(listenState), 3000);
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
    isSpeaking
  };
};
