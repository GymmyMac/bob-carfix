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
  /** Called when a quick-reply CTA button is tapped — fires onNavigate(url), no chat message sent */
  onQuickReply?: (url: string) => void;
  /** Counter height as percentage of container - chat positions above this */
  counterHeightPercent?: number;
  /** Called when PTT is tapped while Bob is speaking — immediately stops audio */
  onInterrupt?: () => void;
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
  onQuickReply,
  onInterrupt,
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

  // 4-state derivation: isSpeaking > isLoading > isListening > idle
  const pttState: 'speaking' | 'processing' | 'listening' | 'idle' = 
    isSpeaking ? 'speaking' : isLoading ? 'processing' : isListening ? 'listening' : 'idle';

  const handlePTTStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();

    // INTERRUPT: If Bob is speaking, stop audio and return to idle
    if (pttState === 'speaking') {
      onInterrupt?.();
      return;
    }

    if (isLoading || pttActiveRef.current) return;
    pttActiveRef.current = true;
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    startListening();
  }, [pttState, isLoading, startListening, onInterrupt]);

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
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.95) 100%)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      borderRadius: '50%',
      boxShadow: '0 8px 32px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
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


  const pttStyleMap = {
    idle: pttButtonStyles.idle,
    listening: pttButtonStyles.active,
    processing: pttButtonStyles.disabled,
    speaking: {
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.95) 100%)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      borderRadius: '50%',
      boxShadow: '0 12px 48px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
    }
  };

  const currentPttStyle = pttStyleMap[pttState];

  // Ring animation config per state
  const ringConfig = {
    idle: { border: '2px solid rgba(34, 197, 94, 0.5)', animation: 'ring-breathe 2s ease-in-out infinite' },
    listening: null, // uses existing ptt-wave rings
    processing: { border: '2px solid rgba(156, 163, 175, 0.6)', animation: 'ring-processing 1.5s ease-in-out infinite' },
    speaking: { border: '2px solid rgba(34, 197, 94, 0.5)', animation: 'ring-speaking 1.8s ease-in-out infinite' },
  };

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
        // v3.2.2: Opaque dark background to prevent backdrop bleed-through (orange shelf behind)
        background: 'rgba(15, 23, 42, 0.92)',
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

                {/* Quick-Reply Navigation Buttons — tap calls onQuickReply(url), no chat message sent */}
                {msg.role === "assistant" && msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {msg.quickReplies.map((qr, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInterrupt?.(); // Bug #1 fix: stop speech before navigating
                          onQuickReply?.(qr.url);
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          border: '1px solid rgba(0,102,204,0.6)',
                          background: 'rgba(0,102,204,0.15)',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          minHeight: 'unset',
                          minWidth: 'unset',
                        }}
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input Area + Status Feedback */}
      <div style={{
        padding: isExpanded ? '8px 12px 4px 12px' : '4px 12px 4px 12px',
        borderTop: isExpanded ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
        pointerEvents: 'auto' as const
      }}>
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
                color: isSpeaking ? '#22c55e' : 'rgba(255,255,255,0.7)',
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
          
          {/* Chat bar: white bg with navy text + state overlays */}
          <div style={{ flex: 1, position: 'relative', height: '40px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={onKeyPress}
              onFocus={onInputFocus}
              onBlur={onInputBlur}
              placeholder="Message Bob..."
              disabled={pttState !== 'idle'}
              className="high-contrast-input bob-chat-input"
              style={{
                width: '100%',
                height: '40px',
                fontSize: '16px',
                padding: '0 14px',
                background: '#FFFFFF',
                border: '2px solid rgba(15, 23, 42, 0.15)',
                borderRadius: '20px',
                color: '#0F172A',
                outline: 'none',
                opacity: pttState !== 'idle' ? 0 : 1,
                transition: 'opacity 0.15s ease',
              }}
            />
            
            {/* State overlay on chat bar */}
            {pttState !== 'idle' && (
              <div className="bob-state-overlay" style={{
                position: 'absolute',
                inset: 0,
                background: '#FFFFFF',
                border: '2px solid rgba(15, 23, 42, 0.15)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
                gap: '8px',
              }}>
                {/* Listening: pulsing orange dot */}
                {pttState === 'listening' && (
                  <>
                    <span style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      backgroundColor: '#FF8C00',
                      animation: 'dot-pulse 1s ease-in-out infinite',
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '14px', color: '#0F172A', fontWeight: 500 }}>Listening...</span>
                  </>
                )}

                {/* Processing: spinning dots */}
                {pttState === 'processing' && (
                  <>
                    <div style={{
                      width: '18px', height: '18px', flexShrink: 0,
                      border: '2px solid rgba(15, 23, 42, 0.15)',
                      borderTop: '2px solid #0F172A',
                      borderRadius: '50%',
                      animation: 'processing-spin 0.8s linear infinite',
                    }} />
                    <span style={{ fontSize: '14px', color: '#0F172A', fontWeight: 500 }}>Bob is researching your input.</span>
                  </>
                )}

                {/* Speaking: waveform bars + muted warning */}
                {pttState === 'speaking' && (
                  <>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '2px', height: '20px', flexShrink: 0,
                    }}>
                      {[0, 0.15, 0.3, 0.45, 0.6].map((delay, i) => (
                        <div key={i} style={{
                          width: '3px',
                          height: '4px',
                          backgroundColor: '#22c55e',
                          borderRadius: '2px',
                          animation: `waveform-bar 0.8s ease-in-out ${delay}s infinite`,
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '14px', color: '#0F172A', fontWeight: 500 }}>Bob is talking...</span>
                    {isMuted && (
                      <svg style={{ height: '16px', width: '16px', color: '#ef4444', marginLeft: 'auto', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Mechanic's Radio PTT Button with 4-state rings */}
          {isSupported && (
            <div style={{ position: 'relative', marginLeft: '4px' }}>
              {/* Listening: Orange wave rings (existing) */}
              {pttState === 'listening' && (
                <>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: '84px', height: '84px', borderRadius: '50%',
                    border: '2px solid #FF9500',
                    transform: 'translate(-50%, -50%)',
                    animation: 'ptt-wave 1.5s ease-out infinite',
                    opacity: 0, pointerEvents: 'none'
                  }} />
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    width: '84px', height: '84px', borderRadius: '50%',
                    border: '2px solid #FF9500',
                    transform: 'translate(-50%, -50%)',
                    animation: 'ptt-wave 1.5s ease-out infinite 0.5s',
                    opacity: 0, pointerEvents: 'none'
                  }} />
                </>
              )}
              
              {/* Idle / Processing / Speaking: single animated ring */}
              {pttState !== 'listening' && ringConfig[pttState] && (
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: '84px', height: '84px', borderRadius: '50%',
                  border: ringConfig[pttState]!.border,
                  transform: 'translate(-50%, -50%)',
                  animation: ringConfig[pttState]!.animation,
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
                disabled={pttState === 'processing'}
                aria-label="Hold to talk to Bob"
                className="glass-button bob-ptt-btn"
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  height: '72px',
                  width: '72px',
                  minHeight: 'unset',
                  minWidth: 'unset',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  userSelect: 'none',
                  touchAction: 'none',
                  color: 'white',
                  cursor: pttState === 'processing' ? 'not-allowed' : 'pointer',
                  opacity: pttState === 'processing' ? 0.6 : 1,
                  transform: pttState === 'listening' ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, background 0.3s ease',
                  zIndex: zIndexBase + 45,
                  backdropFilter: currentPttStyle.backdropFilter,
                  WebkitBackdropFilter: currentPttStyle.WebkitBackdropFilter,
                  '--bob-ptt-bg': currentPttStyle.background,
                  '--bob-ptt-shadow': currentPttStyle.boxShadow,
                  '--bob-ptt-border': currentPttStyle.border,
                  '--bob-ptt-radius': '50%',
                } as React.CSSProperties}
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
                {pttState === 'listening' && (
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
