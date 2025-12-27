import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Volume2, VolumeX } from "lucide-react";
import { Message } from "@/hooks/useBobChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
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
export const ChatInterface = ({
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
}: ChatInterfaceProps) => {
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

  // Update input with interim transcript for real-time feedback
  useEffect(() => {
    if (interimTranscript) {
      setInput(interimTranscript);
    }
  }, [interimTranscript, setInput]);

  // PTT handlers
  const handlePTTStart = useCallback(() => {
    if (isLoading || pttActiveRef.current) return;
    pttActiveRef.current = true;
    startListening();
  }, [isLoading, startListening]);

  const handlePTTEnd = useCallback(() => {
    if (!pttActiveRef.current) return;
    pttActiveRef.current = false;
    stopListening();
    // Send after brief delay to capture final transcript
    setTimeout(() => {
      onSend();
    }, 150);
  }, [stopListening, onSend]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 pb-8">
      <div className="bg-background border border-border rounded-lg shadow-lg overflow-hidden">
        {/* Input Area */}
        <div className="p-4 border-b border-border bg-muted/50">
          {isListening && (
            <div className="mb-2 text-sm text-muted-foreground flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-destructive rounded-full animate-pulse" />
              Listening... Speak now
            </div>
          )}
          {sttError && (
            <div className="mb-2 text-sm text-destructive">
              {sttError}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={onKeyPress}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              placeholder="Ask Bob about car parts..."
              disabled={isLoading}
              className="flex-1"
            />
            {onToggleMute && (
              <Button
                onClick={onToggleMute}
                size="icon"
                variant="outline"
                className={cn("shrink-0", isSpeaking && "animate-pulse")}
                title={isMuted ? "Unmute Bob's voice" : "Mute Bob's voice"}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            )}
            {isSupported && (
              <Button
                onMouseDown={handlePTTStart}
                onMouseUp={handlePTTEnd}
                onMouseLeave={handlePTTEnd}
                onTouchStart={handlePTTStart}
                onTouchEnd={handlePTTEnd}
                disabled={isLoading}
                size="icon"
                variant={isListening ? "destructive" : "default"}
                className={cn(
                  "shrink-0 select-none h-10 w-10",
                  isListening && "animate-pulse ring-2 ring-destructive/50 scale-110"
                )}
                title="Hold to talk"
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Chat History */}
        <div className="overflow-y-auto p-4 space-y-3 h-[300px] md:h-[400px]">
          {[...messages].reverse().map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 text-sm md:text-base ${
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
      </div>
    </div>
  );
};
