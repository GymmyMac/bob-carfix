import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useBobLayoutConfig } from "../../BobProvider";
import type { Message } from "../../types/message";

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
  isSpeaking = false
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
  
  const previewText = lastBobMessage?.content 
    ? lastBobMessage.content.length > 50 
      ? lastBobMessage.content.slice(0, 50) + '...'
      : lastBobMessage.content
    : "Ask Bob about car parts...";

  // PTT button styles - Bob's cartoon style (bold outlines, flat colors)
  const pttButtonStyles = {
    idle: {
      background: '#3B82F6', // Flat blue like Bob's overalls
      border: '3px solid #1a1a1a', // Bold black cartoon outline
      boxShadow: '4px 4px 0 #1a1a1a', // Cartoon offset shadow
    },
    active: {
      background: '#F59E0B', // Flat amber when talking
      border: '3px solid #1a1a1a',
      boxShadow: '2px 2px 0 #1a1a1a', // Pressed in effect
      transform: 'translate(2px, 2px)', // Cartoon press-down
    },
    disabled: {
      background: '#9CA3AF', // Flat grey
      border: '3px solid #6B7280',
      boxShadow: '4px 4px 0 #6B7280',
    }
  };

  const currentPttStyle = isLoading 
    ? pttButtonStyles.disabled 
    : isListening 
      ? pttButtonStyles.active 
      : pttButtonStyles.idle;

  return (
    <div 
      ref={drawerRef}
      style={{
        position: 'fixed',
        bottom: `${bottomOffset}px`,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid #e5e7eb',
        transition: 'all 0.3s ease-out',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
        height: isExpanded ? '55vh' : 'auto',
        zIndex: zIndexBase + 10,
        paddingBottom: bottomOffset > 0 ? '8px' : 'env(safe-area-inset-bottom, 8px)'
      }}
    >
      {/* Expand/Collapse Handle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          position: 'absolute',
          top: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '9999px',
          padding: '6px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          zIndex: zIndexBase + 20,
          cursor: 'pointer',
          minHeight: 'unset',
          minWidth: 'unset'
        }}
        aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
      >
        {isExpanded ? (
          <svg style={{ height: '16px', width: '16px', color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg style={{ height: '16px', width: '16px', color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </button>

      {/* Collapsed Preview */}
      {!isExpanded && (
        <div 
          onClick={() => setIsExpanded(true)}
          style={{ padding: '8px 12px 2px 12px', cursor: 'pointer' }}
        >
          <p style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewText}</p>
        </div>
      )}

      {/* Expanded Chat History */}
      {isExpanded && (
        <div style={{ height: 'calc(100% - 100px)', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[...messages].reverse().map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: '85%',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '14px',
                backgroundColor: msg.role === "user" ? '#2563eb' : '#f3f4f6',
                color: msg.role === "user" ? 'white' : '#111827'
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input Area */}
      <div style={{
        padding: isExpanded ? '8px 8px 6px 8px' : '2px 8px 6px 8px',
        borderTop: isExpanded ? '1px solid #e5e7eb' : 'none'
      }}>
        {isListening && (
          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            Listening...
          </div>
        )}
        
        {sttError && (
          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#ef4444' }}>{sttError}</div>
        )}
        
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {onToggleMute && isExpanded && (
            <button
              onClick={onToggleMute}
              style={{
                flexShrink: 0,
                height: '36px',
                width: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: isSpeaking ? '#2563eb' : '#4b5563',
                cursor: 'pointer',
                border: 'none',
                minHeight: 'unset',
                minWidth: 'unset'
              }}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg style={{ height: '16px', width: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg style={{ height: '16px', width: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            style={{
              flex: 1,
              height: '40px',
              fontSize: '16px',
              padding: '0 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#111827',
              outline: 'none',
              opacity: isLoading ? 0.5 : 1
            }}
          />
          
          {/* Bob's Cartoon PTT Button */}
          {isSupported && (
            <button
              onTouchStart={handlePTTStart}
              onTouchEnd={handlePTTEnd}
              onTouchCancel={handlePTTEnd}
              onMouseDown={handlePTTStart}
              onMouseUp={handlePTTEnd}
              onMouseLeave={handlePTTEnd}
              disabled={isLoading}
              aria-label="Hold to talk to Bob"
              style={{
                position: 'relative',
                flexShrink: 0,
                height: '64px',
                width: '64px',
                minHeight: 'unset',
                minWidth: 'unset',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                touchAction: 'none',
                color: '#1a1a1a', // Black icon for cartoon look
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                marginLeft: '4px',
                ...currentPttStyle
              }}
              title="Hold to talk"
            >
              {/* Microphone icon - bold cartoon stroke */}
              <svg 
                style={{ 
                  height: '26px', 
                  width: '26px',
                }} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
