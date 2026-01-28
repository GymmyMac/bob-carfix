import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useBobLayoutConfig } from "../../BobProvider";
import type { Message } from "../../types/message";
import type { Product } from "../../types/product";
import { glassPanel, glassButtonBlue, glassInput, glassText } from "../../styles/glass";
import { BobSuggestions } from "../BobSuggestions";

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
  onAddToCart?: (product: Product) => void;
  onProductClick?: (product: Product) => void;
  /** Counter height as percentage of container - chat positions above this */
  counterHeightPercent?: number;
}

export const MobileChatDrawer: React.FC<MobileChatDrawerProps> = ({
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
  onAddToCart,
  onProductClick,
  counterHeightPercent = 22
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pttActiveRef = useRef(false);
  
  // Get layout config from context for bottom offset
  const { bottomOffset, zIndexBase } = useBobLayoutConfig();
  
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
  
  // Count products in last message for preview indicator
  const productCount = lastBobMessage?.suggestedProducts?.length || 0;
  
  const previewText = lastBobMessage?.content 
    ? lastBobMessage.content.length > 50 
      ? lastBobMessage.content.slice(0, 50) + '...'
      : lastBobMessage.content
    : "Ask Bob about car parts...";
  
  const previewSuffix = productCount > 0 ? ` (${productCount} products)` : '';

  // Premium Glass TALK button styles
  const talkButtonStyles = {
    idle: {
      ...glassButtonBlue,
    },
    active: {
      background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.95) 0%, rgba(230, 134, 0, 1) 100%)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      borderRadius: '32px',
      boxShadow: '0 12px 48px rgba(255, 149, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
    },
    disabled: {
      background: 'rgba(156, 163, 175, 0.5)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '32px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    }
  };

  const currentTalkStyle = isLoading 
    ? talkButtonStyles.disabled 
    : isListening 
      ? talkButtonStyles.active 
      : talkButtonStyles.idle;

  return (
    <div 
      ref={drawerRef}
      style={{
        position: 'fixed',
        bottom: `calc(${counterHeightPercent}% + ${bottomOffset}px)`,
        left: 0,
        right: 0,
        ...glassPanel,
        borderRadius: '28px 28px 0 0',
        borderBottom: 'none',
        transition: 'all 0.3s ease-out',
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3)',
        height: isExpanded ? '55vh' : 'auto',
        zIndex: zIndexBase + 80,
        paddingBottom: bottomOffset > 0 ? '8px' : 'env(safe-area-inset-bottom, 8px)'
      }}
    >
      {/* Expand/Collapse Handle - Glass style */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '9999px',
          padding: '6px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
          zIndex: zIndexBase + 90,
          cursor: 'pointer',
          minHeight: 'unset',
          minWidth: 'unset'
        }}
        aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
      >
        {isExpanded ? (
          <svg style={{ height: '16px', width: '16px', color: 'rgba(255,255,255,0.8)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg style={{ height: '16px', width: '16px', color: 'rgba(255,255,255,0.8)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </button>

      {/* Collapsed Preview - High contrast with product count */}
      {!isExpanded && (
        <div 
          onClick={() => setIsExpanded(true)}
          style={{ padding: '8px 12px 2px 12px', cursor: 'pointer' }}
        >
          <p style={{ 
            fontSize: '12px', 
            color: 'white', 
            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
            fontWeight: 500,
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap' 
          }}>
            {previewText}
            {previewSuffix && <span style={{ color: 'rgba(255,200,0,0.9)', fontWeight: 600 }}>{previewSuffix}</span>}
          </p>
        </div>
      )}

      {/* Expanded Chat History with Inline Products */}
      {isExpanded && (
        <div style={{ height: 'calc(100% - 100px)', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }} className="glass-scroll">
          {[...messages].reverse().map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: msg.suggestedProducts?.length ? '100%' : '85%',
                borderRadius: '16px',
                padding: '10px 14px',
                fontSize: '14px',
                background: msg.role === "user" 
                  ? 'linear-gradient(135deg, rgba(0, 102, 204, 0.9) 0%, rgba(0, 73, 153, 0.95) 100%)'
                  : 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.95)',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}>
                {msg.content}
                
                {/* Inline Product Suggestions */}
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
      )}

      {/* Floating TALK Button - Premium glass style */}
      {isSupported && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 16px 8px 16px',
        }}>
          <button
            onTouchStart={handlePTTStart}
            onTouchEnd={handlePTTEnd}
            onTouchCancel={handlePTTEnd}
            onMouseDown={handlePTTStart}
            onMouseUp={handlePTTEnd}
            onMouseLeave={handlePTTEnd}
            onClick={isListening ? handlePTTEnd : undefined}
            disabled={isLoading}
            aria-label="Hold to talk to Bob"
            className="glass-button"
            style={{
              width: '200px',
              height: '64px',
              minHeight: 'unset',
              minWidth: 'unset',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              touchAction: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transform: isListening ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, background 0.15s ease',
              ...currentTalkStyle
            }}
            title="Hold to talk"
          >
            <span style={{
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '0.15em',
              ...glassText.primary,
              textTransform: 'uppercase',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
              {isListening ? 'LISTENING' : 'TALK'}
            </span>
          </button>
        </div>
      )}

      {/* Input Area - Glass style */}
      <div style={{
        padding: '4px 12px 8px 12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.15)'
      }}>
        {sttError && (
          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#FF9500' }}>{sttError}</div>
        )}
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              style={{
                flexShrink: 0,
                height: '40px',
                width: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(8px)',
                color: isSpeaking ? '#0066CC' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                minHeight: 'unset',
                minWidth: 'unset'
              }}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg style={{ height: '18px', width: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg style={{ height: '18px', width: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            placeholder="Or type here..."
            disabled={isLoading}
            className="high-contrast-input"
            style={{
              flex: 1,
              height: '40px',
              fontSize: '16px',
              padding: '0 14px',
              background: 'rgba(0, 51, 102, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '2px solid rgba(255, 255, 255, 0.35)',
              borderRadius: '20px',
              color: 'white',
              outline: 'none',
              opacity: isLoading ? 0.5 : 1
            }}
          />
        </div>
      </div>
    </div>
  );
};
