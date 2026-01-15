import React from "react";
import type { Message } from "../types/message";
import type { Product } from "../types/product";
import { BobSuggestions } from "./BobSuggestions";

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
  onAddToCart?: (product: Product) => void;
  onProductClick?: (product: Product) => void;
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
  className = "",
  onAddToCart,
  onProductClick,
}) => {
  return (
    <div className={className} style={{ width: '100%', maxWidth: '72rem', margin: '0 auto', padding: '0 16px 32px 16px' }}>
      <div style={{
        backgroundColor: 'rgba(20, 30, 50, 0.85)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden'
      }}>
        {/* Input Area */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          backgroundColor: 'rgba(0,0,0,0.2)'
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
                padding: '12px 16px',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            {onToggleMute && (
              <button
                onClick={onToggleMute}
                style={{
                  flexShrink: 0,
                  padding: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
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
                padding: '12px 20px',
                background: isLoading || !input.trim() 
                  ? 'rgba(0, 102, 204, 0.3)' 
                  : 'linear-gradient(135deg, rgba(0, 102, 204, 0.95), rgba(0, 73, 153, 1))',
                color: 'white',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !input.trim() ? 0.5 : 1,
                minHeight: 'unset',
                minWidth: 'unset',
                fontWeight: 600
              }}
            >
              Send
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div style={{ 
          overflowY: 'auto', 
          padding: '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px', 
          height: '400px',
          background: 'rgba(0,0,0,0.1)'
        }}>
          {[...messages].reverse().map((msg, idx) => (
            <div
              key={idx}
              style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}
            >
              {/* Message Bubble */}
              <div
                style={{
                  maxWidth: msg.suggestedProducts?.length ? '100%' : '80%',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  backgroundColor: msg.role === "user" 
                    ? 'linear-gradient(135deg, rgba(0, 102, 204, 0.9), rgba(0, 73, 153, 1))'
                    : 'rgba(255,255,255,0.1)',
                  background: msg.role === "user" 
                    ? 'linear-gradient(135deg, rgba(0, 102, 204, 0.9), rgba(0, 73, 153, 1))'
                    : 'rgba(255,255,255,0.08)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                {msg.content}
                
                {/* Inline Product Suggestions for Assistant Messages */}
                {msg.role === "assistant" && msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                  <BobSuggestions
                    products={msg.suggestedProducts}
                    title={msg.suggestionsTitle}
                    onAddToCart={onAddToCart}
                    onProductClick={onProductClick}
                  />
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>
    </div>
  );
};
