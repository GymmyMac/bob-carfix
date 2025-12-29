import React from "react";
import type { Message } from "../types/message";

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
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
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
  isSpeaking = false,
  className = ""
}) => {
  return (
    <div className={className} style={{ width: '100%', maxWidth: '72rem', margin: '0 auto', padding: '0 16px 32px 16px' }}>
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Input Area */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={onKeyPress}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              placeholder="Ask Bob about car parts..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#111827',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            {onToggleMute && (
              <button
                onClick={onToggleMute}
                style={{
                  flexShrink: 0,
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  minHeight: 'unset',
                  minWidth: 'unset'
                }}
                title={isMuted ? "Unmute Bob's voice" : "Mute Bob's voice"}
              >
                {isMuted ? "🔇" : "🔊"}
              </button>
            )}
            <button
              onClick={onSend}
              disabled={isLoading || !input.trim()}
              style={{
                flexShrink: 0,
                padding: '8px 16px',
                backgroundColor: isLoading || !input.trim() ? '#93c5fd' : '#2563eb',
                color: 'white',
                borderRadius: '6px',
                border: 'none',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !input.trim() ? 0.5 : 1,
                minHeight: 'unset',
                minWidth: 'unset'
              }}
            >
              Send
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div style={{ overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '400px' }}>
          {[...messages].reverse().map((msg, idx) => (
            <div
              key={idx}
              style={{ display: 'flex', justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: msg.role === "user" ? '#2563eb' : '#f3f4f6',
                  color: msg.role === "user" ? 'white' : '#111827'
                }}
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
