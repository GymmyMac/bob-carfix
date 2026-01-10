import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, X } from "lucide-react";
import { toast } from "sonner";

type AnimationState = "idle" | "thinking" | "talking" | "happy" | "complete";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const BobWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const [isTalkToggle, setIsTalkToggle] = useState(false);
  const [isThinkToggle, setIsThinkToggle] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<AnimationState, string>>({
    idle: "",
    thinking: "",
    talking: "",
    happy: "",
    complete: ""
  });
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const talkIntervalRef = useRef<NodeJS.Timeout>();
  const thinkIntervalRef = useRef<NodeJS.Timeout>();

  // Load Bob images from public folder
  useEffect(() => {
    setImageUrls({
      idle: "/bob-animations/idle.png",
      thinking: "/bob-animations/thinking.png",
      talking: "/bob-animations/talk-small.png",
      happy: "/bob-animations/happy.png",
      complete: "/bob-animations/23628891-3eb9-40bf-b2f5-dda69129038a.png"
    });
  }, []);

  // Preload images
  useEffect(() => {
    const allImages = [
      ...Object.values(imageUrls),
      "/bob-animations/Bob talk small.png",
      "/bob-animations/Bob thinking.png"
    ];
    allImages.forEach(url => {
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [imageUrls]);

  // Handle talking animation toggle
  useEffect(() => {
    if (animationState === "talking") {
      talkIntervalRef.current = setInterval(() => {
        setIsTalkToggle(prev => !prev);
      }, 400);
    } else {
      if (talkIntervalRef.current) {
        clearInterval(talkIntervalRef.current);
      }
      setIsTalkToggle(false);
    }
    
    return () => {
      if (talkIntervalRef.current) {
        clearInterval(talkIntervalRef.current);
      }
    };
  }, [animationState]);

  // Handle thinking animation toggle
  useEffect(() => {
    if (animationState === "thinking") {
      thinkIntervalRef.current = setInterval(() => {
        setIsThinkToggle(prev => !prev);
      }, 600);
    } else {
      if (thinkIntervalRef.current) {
        clearInterval(thinkIntervalRef.current);
      }
      setIsThinkToggle(false);
    }
    
    return () => {
      if (thinkIntervalRef.current) {
        clearInterval(thinkIntervalRef.current);
      }
    };
  }, [animationState]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send initial greeting when widget opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "G'day! Bob from CARFIX here. How can I help ya today?"
      }]);
    }
  }, [isOpen]);

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

      setAnimationState("talking");

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

      // Post-response animation
      setAnimationState("happy");
      setTimeout(() => setAnimationState("idle"), 3000);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to send message. Please try again.");
      setAnimationState("idle");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setAnimationState("thinking");

    await streamChat(userMessage);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getCurrentImage = () => {
    if (animationState === "talking") {
      return isTalkToggle ? "/bob-animations/Bob talk small.png" : "/bob-animations/talk-small.png";
    }
    
    if (animationState === "thinking") {
      return isThinkToggle ? "/bob-animations/Bob thinking.png" : "/bob-animations/thinking.png";
    }
    
    return imageUrls[animationState] || imageUrls.idle;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-20 h-20 rounded-full shadow-lg hover:scale-110 transition-transform bg-white border-2 border-primary overflow-hidden"
        aria-label="Open Bob chat"
      >
        <img src={imageUrls.idle} alt="Bob" className="w-full h-full object-cover" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[320px] bg-background border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white overflow-hidden">
            <img src={imageUrls.idle} alt="Bob" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Bob from CARFIX</h3>
            <p className="text-xs opacity-90">Auto Parts Expert</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Bob Animation */}
      <div className="bg-muted p-4 flex items-center justify-center border-b border-border">
        <div className="w-32 h-32 relative">
          <img
            src={getCurrentImage()}
            alt={`Bob ${animationState}`}
            className="w-full h-full object-contain transition-opacity duration-200"
          />
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px] bg-background">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-background">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Bob about car parts..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Future: TTS Integration Placeholder */}
      {/* TODO: Add ElevenLabs TTS integration for Bob's voice */}
      
      {/* Future: Parts Lookup Placeholder */}
      {/* TODO: Add Supabase parts lookup functionality */}
    </div>
  );
};
