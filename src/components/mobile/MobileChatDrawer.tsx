import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Volume2, VolumeX, ChevronUp, ChevronDown } from "lucide-react";
import { Message } from "@/hooks/useBobChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { cn } from "@/lib/utils";

interface MobileChatDrawerProps {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onInputFocus: () => void;
  onInputBlur: () => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  isMuted?: boolean;
  onToggleMute?: () => void;
  isSpeaking?: boolean;
}

export const MobileChatDrawer = ({
  messages,
  input,
  setInput,
  isLoading,
  onSend,
  onKeyPress,
  onInputFocus,
  onInputBlur,
  chatEndRef,
  isMuted = false,
  onToggleMute,
  isSpeaking = false
}: MobileChatDrawerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pttActiveRef = useRef(false);
  
  const {
    isListening,
    interimTranscript,
    error: sttError,
    isSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onTranscript: (text) => setInput(text),
    language: 'en-NZ',
    mode: 'ptt'
  });

  useEffect(() => {
    if (interimTranscript) {
      setInput(interimTranscript);
    }
  }, [interimTranscript, setInput]);

  // PTT handlers with haptic feedback - mechanic's feel
  const handlePTTStart = useCallback(() => {
    if (isLoading || pttActiveRef.current) return;
    pttActiveRef.current = true;
    // Stronger haptic for mechanic feel
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    startListening();
  }, [isLoading, startListening]);

  const handlePTTEnd = useCallback(() => {
    if (!pttActiveRef.current) return;
    pttActiveRef.current = false;
    // Double pulse on release
    if (navigator.vibrate) {
      navigator.vibrate([20, 50, 20]);
    }
    stopListening();
    setTimeout(() => {
      onSend();
    }, 150);
  }, [stopListening, onSend]);

  const lastBobMessage = [...messages].reverse().find(m => m.role === 'assistant');
  
  const previewText = lastBobMessage?.content 
    ? lastBobMessage.content.length > 50 
      ? lastBobMessage.content.slice(0, 50) + '...'
      : lastBobMessage.content
    : "Ask Bob about car parts...";

  return (
    <div 
      ref={drawerRef}
      className={cn(
        "fixed bottom-0 left-0 right-0",
        "bg-background/95 backdrop-blur-md border-t border-border",
        "transition-all duration-300 ease-out",
        "shadow-[0_-4px_20px_rgba(0,0,0,0.15)]",
        isExpanded ? "h-[55vh]" : "h-auto"
      )}
      style={{
        zIndex: 60,
        paddingBottom: 'env(safe-area-inset-bottom, 8px)'
      }}
    >
      {/* Expand/Collapse Handle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -top-5 left-1/2 -translate-x-1/2 
                   bg-background border border-border rounded-full 
                   p-1.5 shadow-lg z-40"
        aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Collapsed Preview */}
      {!isExpanded && (
        <div 
          className="px-3 pt-2 pb-0.5"
          onClick={() => setIsExpanded(true)}
        >
          <p className="text-xs text-muted-foreground line-clamp-1">
            {previewText}
          </p>
        </div>
      )}

      {/* Expanded Chat History */}
      {isExpanded && (
        <div className="h-[calc(100%-100px)] overflow-y-auto p-4 space-y-2">
          {[...messages].reverse().map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input Area */}
      <div className={cn(
        "px-2 pb-1.5",
        isExpanded ? "pt-2 border-t border-border" : "pt-0.5"
      )}>
        {isListening && (
          <div className="mb-2 text-xs text-muted-foreground flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            Listening...
          </div>
        )}
        
        {sttError && (
          <div className="mb-2 text-xs text-destructive">
            {sttError}
          </div>
        )}
        
        <div className="flex gap-1.5 items-center">
          {/* Mute button */}
          {onToggleMute && isExpanded && (
            <Button
              onClick={onToggleMute}
              size="icon"
              variant="ghost"
              className={cn(
                "shrink-0 h-9 w-9",
                isSpeaking && "text-primary animate-pulse"
              )}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          )}
          
          {/* Text input */}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={onKeyPress}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder="Message Bob..."
            disabled={isLoading}
            className="flex-1 h-10 text-base"
          />
          
          {/* Mechanic's Radio PTT Button - Large green button */}
          {isSupported && (
            <div className="relative ml-1">
              {/* Radio wave animations when active */}
              {isListening && (
                <>
                  <div className="absolute top-1/2 left-1/2 w-[72px] h-[72px] rounded-full border-2 border-amber-500 -translate-x-1/2 -translate-y-1/2 animate-ptt-wave opacity-0 pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 w-[72px] h-[72px] rounded-full border-2 border-amber-500 -translate-x-1/2 -translate-y-1/2 animate-ptt-wave opacity-0 pointer-events-none" style={{ animationDelay: '0.5s' }} />
                </>
              )}
              
              {/* Idle pulse glow */}
              {!isListening && !isLoading && (
                <div className="absolute top-1/2 left-1/2 w-[72px] h-[72px] rounded-full -translate-x-1/2 -translate-y-1/2 animate-ptt-pulse pointer-events-none" />
              )}
              
              <Button
                onTouchStart={handlePTTStart}
                onTouchEnd={handlePTTEnd}
                onTouchCancel={handlePTTEnd}
                onMouseDown={handlePTTStart}
                onMouseUp={handlePTTEnd}
                onMouseLeave={handlePTTEnd}
                disabled={isLoading}
                size="icon"
                className={cn(
                  "relative shrink-0 rounded-full select-none touch-none transition-all duration-200",
                  "h-[72px] w-[72px]",
                  isListening 
                    ? "scale-115 bg-gradient-to-b from-amber-400 to-amber-600 shadow-[0_6px_20px_rgba(245,158,11,0.4),inset_0_2px_4px_rgba(255,255,255,0.2),0_0_0_4px_rgb(180,83,9)]" 
                    : "bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_6px_20px_rgba(34,197,94,0.4),inset_0_2px_4px_rgba(255,255,255,0.2),0_0_0_4px_rgb(21,128,61)]",
                  isLoading && "opacity-60 cursor-not-allowed bg-gradient-to-b from-gray-400 to-gray-600 shadow-[0_2px_8px_rgba(156,163,175,0.3),0_0_0_4px_rgb(75,85,99)]"
                )}
                style={{
                  transform: isListening ? 'scale(1.15)' : 'scale(1)',
                }}
                title="Hold to talk"
              >
                <Mic className="h-7 w-7 drop-shadow-sm" strokeWidth={2.5} />
                
                {/* Active indicator dot */}
                {isListening && (
                  <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-amber-100 animate-pulse" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
