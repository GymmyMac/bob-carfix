import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff } from "lucide-react";
import { Message } from "@/hooks/useBobChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useEffect } from "react";

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
  chatEndRef
}: ChatInterfaceProps) => {
  const {
    isListening,
    transcript,
    interimTranscript,
    error: sttError,
    isSupported,
    toggleListening
  } = useSpeechRecognition({
    onTranscript: (text) => setInput(text),
    language: 'en-NZ'
  });

  // Update input with interim transcript for real-time feedback
  useEffect(() => {
    if (interimTranscript) {
      setInput(interimTranscript);
    }
  }, [interimTranscript, setInput]);

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
            {isSupported && (
              <Button
                onClick={toggleListening}
                disabled={isLoading}
                size="icon"
                variant={isListening ? "destructive" : "outline"}
                className={`shrink-0 ${isListening ? 'animate-pulse' : ''}`}
                title={isListening ? "Stop recording" : "Start voice input"}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              onClick={onSend}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat History */}
        <div className="overflow-y-auto p-4 space-y-3 h-[180px] md:h-[200px]">
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
