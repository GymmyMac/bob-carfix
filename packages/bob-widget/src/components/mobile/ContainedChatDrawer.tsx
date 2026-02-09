import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useBobLayoutConfig } from "../../BobProvider";
import type { Message } from "../../types/message";
import { glassPanel, glassButtonBlue, glassInput, glassText } from "../../styles/glass";

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
  /** Counter height as percentage of container - chat positions above this */
  counterHeightPercent?: number;
}

/**
 * ContainedChatDrawer - Premium Glassmorphism Chat Drawer
 * iOS 26 liquid glass design with CARFIX branding
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
  isSpeaking = false,
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
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    startListening();
  }, [isLoading, startListening]);

  const handlePTTEnd = useCallback(() => {
    if (!pttActiveRef.current) return;
    pttActiveRef.current = false;
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

  // Premium Glass PTT button styles
  const pttButtonStyles = {
    idle: {
      ...glassButtonBlue,
    },
    active: {
      background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.95) 0%, rgba(230, 134, 0, 1) 100%)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      borderRadius: '50%',
      boxShadow: '0 12px 48px rgba(255, 149, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
    },
    disabled: {
      background: 'rgba(156, 163, 175, 0.5)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '50%',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
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
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        top: 'auto',
        contain: 'layout',
        // v3.2.1: GPU-accelerated isolation - prevents position drift during message updates
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        isolation: 'isolate',
        ...glassPanel,
        borderRadius: '28px 28px 0 0',
        borderBottom: 'none',
        // v3.2.1: Strictly scoped transitions - only height changes, no position animation
        transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3)',
        height: isExpanded ? '55%' : '110px',
        overflow: 'visible',
        zIndex: zIndexBase + 30,
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        // Passthrough: glass background doesn't intercept touch; children re-enable
        pointerEvents: 'none' as const
      }}
    >
      {/* Expand/Collapse Handle - Glass style with full visibility */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          position: 'absolute',
          top: '-24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 102, 204, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '2px solid rgba(255, 255, 255, 0.35)',
          borderRadius: '9999px',
          padding: '8px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          zIndex: zIndexBase + 40,
          cursor: 'pointer',
          minHeight: '32px',
          minWidth: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto' as const
        }}
        aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
      >
        {isExpanded ? (
          <svg style={{ height: '16px', width: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg style={{ height: '16px', width: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </button>

      {/* Collapsed Preview - High contrast */}
      {!isExpanded && (
        <div 
          onClick={() => setIsExpanded(true)}
          style={{ padding: '6px 12px 4px 12px', height: '26px', overflow: 'hidden', cursor: 'pointer', pointerEvents: 'auto' as const }}
        >
          <p style={{ 
            fontSize: '12px', 
            color: 'white', 
            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
            fontWeight: 500,
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap' 
          }}>{previewText}</p>
        </div>
      )}

      {/* Expanded Chat History */}
      {isExpanded && (
        <div style={{ height: 'calc(100% - 100px)', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto' as const }} className="glass-scroll">
          {[...messages].reverse().map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: '85%',
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
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input Area - Glass style */}
      <div style={{
        padding: isExpanded ? '8px 12px 4px 12px' : '4px 12px 4px 12px',
        borderTop: isExpanded ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
        pointerEvents: 'auto' as const
      }}>
        {isListening && (
          <div style={{ 
            position: 'absolute',
            top: '4px',
            left: '12px',
            fontSize: '12px', 
            color: 'rgba(255,255,255,0.9)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            zIndex: 10,
            textShadow: '0 1px 3px rgba(0,0,0,0.5)'
          }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#FF9500', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            Listening...
          </div>
        )}
        
        {sttError && (
          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#FF9500' }}>{sttError}</div>
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
                borderRadius: '10px',
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
          
          {/* Mechanic's Radio PTT Button - Premium glass */}
          {isSupported && (
            <div style={{ position: 'relative', marginLeft: '4px' }}>
              {/* Radio wave animations when active */}
              {isListening && (
                <>
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    border: '2px solid #FF9500',
                    transform: 'translate(-50%, -50%)',
                    animation: 'ptt-wave 1.5s ease-out infinite',
                    opacity: 0,
                    pointerEvents: 'none'
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    border: '2px solid #FF9500',
                    transform: 'translate(-50%, -50%)',
                    animation: 'ptt-wave 1.5s ease-out infinite 0.5s',
                    opacity: 0,
                    pointerEvents: 'none'
                  }} />
                </>
              )}
              
              {/* Idle pulse glow */}
              {!isListening && !isLoading && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  animation: 'ptt-pulse 2s ease-in-out infinite',
                  pointerEvents: 'none'
                }} />
              )}
              
              <button
                onTouchStart={handlePTTStart}
                onTouchEnd={handlePTTEnd}
                onTouchCancel={handlePTTEnd}
                onMouseDown={handlePTTStart}
                onMouseUp={handlePTTEnd}
                onMouseLeave={handlePTTEnd}
                disabled={isLoading}
                aria-label="Hold to talk to Bob"
                className="glass-button"
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  height: '72px',
                  width: '72px',
                  minHeight: 'unset',
                  minWidth: 'unset',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  userSelect: 'none',
                  touchAction: 'none',
                  color: 'white',
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  transform: isListening ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
                  zIndex: zIndexBase + 45,
                  ...currentPttStyle
                }}
                title="Hold to talk"
              >
                {/* Microphone icon */}
                <svg 
                  style={{ 
                    height: '28px', 
                    width: '28px',
                    filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2))'
                  }} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2.5} 
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
                  />
                </svg>
                
                {/* Active indicator */}
                {isListening && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#fef3c7',
                    animation: 'ptt-dot 0.6s ease-in-out infinite alternate'
                  }} />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
