import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import type { Message } from "../../types/message";

interface ContainedChatDrawerProps {
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

/**
 * ContainedChatDrawer - Chat drawer using absolute positioning
 * Stays within parent container bounds instead of viewport.
 */
export const ContainedChatDrawer: React.FC<ContainedChatDrawerProps> = ({
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
}) => {
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

  const handlePTTStart = useCallback(() => {
    if (isLoading || pttActiveRef.current) return;
    pttActiveRef.current = true;
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    startListening();
  }, [isLoading, startListening]);

  const handlePTTEnd = useCallback(() => {
    if (!pttActiveRef.current) return;
    pttActiveRef.current = false;
    if (navigator.vibrate) {
      navigator.vibrate(10);
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
      className={`absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 transition-all duration-300 ease-out shadow-[0_-4px_20px_rgba(0,0,0,0.15)] ${isExpanded ? "h-[55%]" : ""}`}
      style={{
        zIndex: 60,
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        minHeight: isExpanded ? undefined : '70px'
      }}
    >
      {/* Expand/Collapse Handle - centered with flexbox */}
      <div className="absolute -top-5 left-0 right-0 flex justify-center z-40">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-white border border-gray-200 rounded-full p-1.5 shadow-lg"
          aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
        >
          {isExpanded ? (
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Collapsed Preview */}
      {!isExpanded && (
        <div className="px-3 pt-1.5 pb-1" onClick={() => setIsExpanded(true)}>
          <p className="text-xs text-gray-500 line-clamp-1">{previewText}</p>
        </div>
      )}

      {/* Expanded Chat History */}
      {isExpanded && (
        <div className="h-[calc(100%-100px)] overflow-y-auto p-4 space-y-2">
          {[...messages].reverse().map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-100 text-gray-900"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input Area */}
      <div className={`px-3 pb-1 ${isExpanded ? "pt-2 border-t border-gray-200" : "pt-1"}`}>
        {isListening && (
          <div className="mb-2 text-xs text-gray-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Listening...
          </div>
        )}
        
        {sttError && (
          <div className="mb-2 text-xs text-red-500">{sttError}</div>
        )}
        
        <div className="flex gap-1.5 items-center">
          {onToggleMute && isExpanded && (
            <button
              onClick={onToggleMute}
              className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-md hover:bg-gray-100 ${
                isSpeaking ? "text-blue-600 animate-pulse" : "text-gray-600"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
          )}
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={onKeyPress}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder="Message Bob..."
            disabled={isLoading}
            className="flex-1 h-10 text-base px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          
          {isSupported && (
            <button
              onTouchStart={handlePTTStart}
              onTouchEnd={handlePTTEnd}
              onTouchCancel={handlePTTEnd}
              onMouseDown={handlePTTStart}
              onMouseUp={handlePTTEnd}
              onMouseLeave={handlePTTEnd}
              disabled={isLoading}
              className={`shrink-0 h-12 w-12 rounded-full flex items-center justify-center select-none touch-none ${
                isListening 
                  ? "bg-red-500 text-white animate-pulse ring-2 ring-red-300 scale-110" 
                  : "bg-blue-600 text-white"
              } disabled:opacity-50`}
              title="Hold to talk"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
