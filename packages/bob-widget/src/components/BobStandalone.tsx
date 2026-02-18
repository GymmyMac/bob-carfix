/**
 * BobStandalone - Simplified Bob Widget for v3.1.0
 * 
 * Partners only need to pass `partner="CARFIX"` - everything else auto-loads from database.
 * This component wraps BobProvider + Bob with auto-configuration.
 * 
 * @example
 * ```tsx
 * import { BobStandalone } from '@gymmymac/bob-widget';
 * 
 * function AskBobPage() {
 *   const { addToCart } = useCart();
 *   const router = useRouter();
 *   const sessionToken = router.query.session as string;
 * 
 *   return (
 *     <div className="h-[calc(100dvh-136px)]">
 *       <BobStandalone
 *         partner="CARFIX"
 *         sessionToken={sessionToken}
 *         onAddToCart={(item) => addToCart(item)}
 *         onNavigate={(url) => router.push(url)}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */

import React, { useEffect, useMemo, useRef, useImperativeHandle } from 'react';
import { BobProvider } from '../BobProvider';
import { Bob } from './Bob';
import { BobDebugOverlay } from './BobDebugOverlay';
import { usePartnerConfig, getFeatureFlag } from '../hooks/usePartnerConfig';
import { BOB_VERSION } from '../version';
import type { StandaloneWidgetProps } from '../types/partner';
import type { BobCallbacks, HostContext } from '../types/context';

// Import CSS reset for isolation
import '../styles/widget-reset.css';

/**
 * Loading state component
 */
const LoadingState: React.FC = () => (
  <div className="bob-widget-root" style={{ 
    width: '100%', 
    height: '100%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #0a1628 0%, #0f2137 100%)',
  }}>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '4px solid rgba(0, 102, 204, 0.3)',
        borderTopColor: '#0066cc',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
        Loading Bob...
      </span>
    </div>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

/**
 * Error state component
 */
const ErrorState: React.FC<{ error: Error; partner: string }> = ({ error, partner }) => (
  <div className="bob-widget-root" style={{ 
    width: '100%', 
    height: '100%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #1a0a0a 0%, #2a1515 100%)',
    padding: '24px',
  }}>
    <div style={{
      maxWidth: '400px',
      textAlign: 'center',
      color: 'white',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
        Bob Widget Error
      </h3>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '16px' }}>
        {error.message}
      </p>
      <code style={{ 
        display: 'block',
        fontSize: '12px', 
        background: 'rgba(255,0,0,0.1)', 
        padding: '12px',
        borderRadius: '8px',
        color: '#ff6b6b',
      }}>
        Partner: {partner}<br />
        Origin: {typeof window !== 'undefined' ? window.location.origin : 'unknown'}
      </code>
    </div>
  </div>
);

/**
 * Imperative handle exposed via ref on BobStandalone.
 * Allows hosts to programmatically stop speech, e.g. when navigating away.
 *
 * @example
 * ```tsx
 * const bobRef = useRef<BobStandaloneHandle>(null);
 * bobRef.current?.stopSpeech();
 * <BobStandalone ref={bobRef} partner="CARFIX" ... />
 * ```
 */
export interface BobStandaloneHandle {
  /** Stop any active speech (TTS or canned audio) immediately */
  stopSpeech: () => void;
  /** Alias for stopSpeech - interrupts Bob mid-sentence */
  interrupt: () => void;
}

/**
 * BobStandalone - Simplified partner integration component
 * 
 * Reduces integration from 30+ lines to just 4 lines of code.
 * All configuration is auto-loaded from the bob_partners database table.
 */
export const BobStandalone = React.forwardRef<BobStandaloneHandle, StandaloneWidgetProps>(({
  partner,
  sessionToken,
  bottomOffset: propsBottomOffset,
  zIndexBase: propsZIndexBase,
  backdropBlurIntensity: propsBlurIntensity,
  backdropOverlayOpacity: propsOverlayOpacity,
  onAddToCart,
  onNavigate,
  onCheckout,
  onError,
  debug = false,
  className = '',
}, ref) => {
  // Capture stopSpeech from useBobChat so we can expose it imperatively via ref
  const stopSpeechRef = useRef<(() => void) | null>(null);

  useImperativeHandle(ref, () => ({
    stopSpeech: () => stopSpeechRef.current?.(),
    interrupt: () => stopSpeechRef.current?.(),
  }));

  // Auto-load partner configuration
  const { config, isLoading, error, supabaseClient } = usePartnerConfig(partner);

  // Log initialization
  useEffect(() => {
    console.log('[BobStandalone] Initialized', {
      version: BOB_VERSION,
      partner,
      sessionToken: sessionToken ? 'present' : 'none',
      debug,
    });
  }, [partner, sessionToken, debug]);

  // ✅ CRITICAL: All hooks MUST be called before any conditional returns
  // Build callbacks - map essential callbacks to full BobCallbacks interface
  const callbacks: BobCallbacks = useMemo(() => ({
    onAddToCart: onAddToCart ? (item) => onAddToCart(item) : undefined,
    onCheckoutRequested: onCheckout,
    onError,
    onNavigateToProductPage: onNavigate 
      ? (product: unknown) => {
          const p = product as { sku?: string; url?: string };
          // Quick-reply navigation passes { url } directly
          if (p?.url) {
            onNavigate(p.url);
          } else if (p?.sku) {
            onNavigate(`/product/${p.sku}`);
          }
        }
      : undefined,
    // Wire stopSpeech capture so BobStandalone ref can expose it imperatively
    onStopSpeechReady: (fn) => {
      stopSpeechRef.current = fn;
    },
  }), [onAddToCart, onNavigate, onCheckout, onError]);

  // Build host context from session token if provided
  const hostContext: HostContext = useMemo(() => {
    // Session token handling is done via URL param in bob-chat
    // The session-handoff edge function resolves vehicle/user context
    return {};
  }, []);

  // Show loading state - AFTER all hooks
  if (isLoading) {
    return <LoadingState />;
  }

  // Show error state - AFTER all hooks
  if (error || !config || !supabaseClient) {
    const displayError = error || new Error('Failed to initialize Bob');
    onError?.(displayError);
    return <ErrorState error={displayError} partner={partner} />;
  }

  // Merge config with prop overrides (safe after config is confirmed non-null)
  const bottomOffset = propsBottomOffset ?? config.default_bottom_offset;
  const zIndexBase = propsZIndexBase ?? config.default_z_index_base;
  const showDebug = debug || getFeatureFlag(config, 'showDebugOverlay', false);

  return (
    <div 
      className={`bob-widget-root ${className}`} 
      style={{ 
        width: '100%', 
        height: '100%',
        // CSS variables for partner-specific styling
        ['--bob-blur-intensity' as string]: `${propsBlurIntensity ?? config.backdrop_blur_intensity}px`,
        ['--bob-overlay-opacity' as string]: propsOverlayOpacity ?? config.backdrop_overlay_opacity,
        ['--bob-z-base' as string]: zIndexBase,
      }}
    >
      <BobProvider
        bobConfig={{
          supabaseUrl: config.bob_supabase_url,
          supabaseKey: config.bob_supabase_key,
        }}
        hostApiConfig={{
          baseUrl: config.api_base_url,
          apiKey: '', // API key is handled server-side via config.api_key_secret_name
          partnerCode: config.partner_code,
        }}
        hostContext={hostContext}
        callbacks={callbacks}
        bottomOffset={bottomOffset}
        zIndexBase={zIndexBase}
      >
        <Bob
          variant="inline"
          sessionToken={sessionToken}
        />
        {showDebug && (
          <BobDebugOverlay 
            partnerConfig={config}
            sessionToken={sessionToken}
          />
        )}
      </BobProvider>
    </div>
  );
});

export default BobStandalone;
