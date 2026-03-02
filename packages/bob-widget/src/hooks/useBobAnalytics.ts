import { useCallback, useRef, useEffect } from 'react';
import { BOB_VERSION } from '../version';
import type {
  BobEventName,
  BobAnalyticsEvent,
  BobGA4Config,
} from '../types/analytics';
import type { HostContext, BobCallbacks } from '../types/context';

// Debounce conversation tracking to avoid flooding on rapid messages
const CONVERSATION_TRACK_DEBOUNCE_MS = 5000;

// Generate a unique session ID
const generateSessionId = (): string => {
  return `bob_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag?: (
      command: 'event',
      eventName: string,
      eventParams?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

interface UseBobAnalyticsProps {
  /** GA4 configuration */
  ga4Config?: BobGA4Config;
  /** Host context for user/vehicle info */
  hostContext?: HostContext;
  /** Callbacks including onAnalyticsEvent */
  callbacks?: BobCallbacks;
  /** Whether analytics is enabled */
  enabled?: boolean;
  /** Bob Supabase URL for conversation tracking */
  bobSupabaseUrl?: string;
  /** Bob Supabase anon key for conversation tracking */
  bobSupabaseKey?: string;
}

interface UseBobAnalyticsReturn {
  /** Track any event */
  trackEvent: (
    eventName: BobEventName,
    parameters?: Record<string, unknown>
  ) => void;
  /** Session ID for this widget instance */
  sessionId: string;
  /** Track session start */
  trackSessionStart: () => void;
  /** Track message sent */
  trackMessageSent: (messageLength: number, hasVehicle: boolean) => void;
  /** Track vehicle identified */
  trackVehicleIdentified: (vehicle: {
    make?: string;
    model?: string;
    year?: string | number;
    rego?: string;
  }) => void;
  /** Track parts viewed */
  trackPartsViewed: (partCount: number, vehicleId?: string) => void;
  /** Track product clicked */
  trackProductClicked: (product: {
    sku: string;
    product_name: string;
    price: number;
    brand?: string;
  }) => void;
  /** Track product viewed (detail) */
  trackProductViewed: (product: {
    sku: string;
    product_name: string;
    price: number;
    brand?: string;
  }) => void;
  /** Track add to cart */
  trackAddToCart: (product: {
    sku: string;
    product_name: string;
    price: number;
    brand?: string;
    quantity?: number;
  }) => void;
  /** Track checkout started */
  trackCheckoutStarted: (cartValue: number, itemCount: number) => void;
  /** Track speech played */
  trackSpeechPlayed: (textLength: number) => void;
  /** Track speech failed */
  trackSpeechFailed: (textLength: number) => void;
  /** Track error */
  trackError: (errorType: string, errorMessage: string) => void;
  /** Track conversation activity (upsert to bob_conversations) */
  trackConversationActivity: (extras?: {
    had_product_match?: boolean;
    led_to_cart?: boolean;
    vehicle_id?: string;
    rego?: string;
  }) => void;
}

/**
 * Hook for tracking Bob widget analytics events
 * 
 * Sends events to:
 * 1. GA4 via gtag() if configured and available
 * 2. onAnalyticsEvent callback for server-side storage
 */
export function useBobAnalytics({
  ga4Config,
  hostContext,
  callbacks,
  enabled = true,
  bobSupabaseUrl,
  bobSupabaseKey,
}: UseBobAnalyticsProps): UseBobAnalyticsReturn {
  // Generate session ID once per hook instance
  const sessionIdRef = useRef<string>(generateSessionId());
  const sessionStartedRef = useRef(false);
  const conversationTrackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingConversationRef = useRef(false);

  // Fire GA4 event if gtag is available
  const fireGA4Event = useCallback(
    (eventName: string, params: Record<string, unknown>) => {
      if (!ga4Config?.measurementId || typeof window === 'undefined') return;

      if (window.gtag) {
        const ga4Params = {
          ...params,
          send_to: ga4Config.measurementId,
        };

        if (ga4Config.debug) {
          console.log('[BobAnalytics] GA4 event:', eventName, ga4Params);
        }

        window.gtag('event', eventName, ga4Params);
      }
    },
    [ga4Config]
  );

  // Core tracking function
  const trackEvent = useCallback(
    (eventName: BobEventName, parameters: Record<string, unknown> = {}) => {
      if (!enabled) return;

      const event: BobAnalyticsEvent = {
        event_name: eventName,
        timestamp: new Date().toISOString(),
        session_id: sessionIdRef.current,
        user_email: hostContext?.user?.email,
        user_id: hostContext?.user?.id,
        vehicle_id: hostContext?.vehicle?.selectedVehicle?.vehicle_id?.toString(),
        rego: hostContext?.vehicle?.selectedVehicle?.rego,
        parameters,
      };

      // Fire to GA4
      fireGA4Event(eventName, {
        session_id: event.session_id,
        user_email: event.user_email,
        vehicle_id: event.vehicle_id,
        ...parameters,
      });

      // Fire callback for server-side storage
      callbacks?.onAnalyticsEvent?.(event);

      if (ga4Config?.debug) {
        console.log('[BobAnalytics] Event tracked:', event);
      }
    },
    [enabled, hostContext, callbacks, fireGA4Event, ga4Config?.debug]
  );

  // Session start (call once on mount)
  const trackSessionStart = useCallback(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    trackEvent('bob_session_start', {
      widget_version: BOB_VERSION,
      has_vehicle: !!hostContext?.vehicle?.selectedVehicle,
      has_user: !!hostContext?.user?.id || !!hostContext?.user?.email,
    });
  }, [trackEvent, hostContext]);

  // Message sent
  const trackMessageSent = useCallback(
    (messageLength: number, hasVehicle: boolean) => {
      trackEvent('bob_message_sent', {
        message_length: messageLength,
        has_vehicle: hasVehicle,
      });
    },
    [trackEvent]
  );

  // Vehicle identified
  const trackVehicleIdentified = useCallback(
    (vehicle: {
      make?: string;
      model?: string;
      year?: string | number;
      rego?: string;
    }) => {
      trackEvent('bob_vehicle_identified', {
        vehicle_make: vehicle.make || 'unknown',
        vehicle_model: vehicle.model || 'unknown',
        vehicle_year: vehicle.year || 'unknown',
        rego: vehicle.rego,
      });
    },
    [trackEvent]
  );

  // Parts viewed
  const trackPartsViewed = useCallback(
    (partCount: number, vehicleId?: string) => {
      trackEvent('bob_parts_viewed', {
        part_count: partCount,
        vehicle_id: vehicleId,
      });
    },
    [trackEvent]
  );

  // Product clicked
  const trackProductClicked = useCallback(
    (product: {
      sku: string;
      product_name: string;
      price: number;
      brand?: string;
    }) => {
      trackEvent('bob_product_clicked', {
        sku: product.sku,
        product_name: product.product_name,
        price: product.price,
        brand: product.brand,
      });
    },
    [trackEvent]
  );

  // Product viewed (detail)
  const trackProductViewed = useCallback(
    (product: {
      sku: string;
      product_name: string;
      price: number;
      brand?: string;
    }) => {
      trackEvent('bob_product_viewed', {
        sku: product.sku,
        product_name: product.product_name,
        price: product.price,
        brand: product.brand,
      });
    },
    [trackEvent]
  );

  // Add to cart
  const trackAddToCart = useCallback(
    (product: {
      sku: string;
      product_name: string;
      price: number;
      brand?: string;
      quantity?: number;
    }) => {
      trackEvent('bob_add_to_cart', {
        sku: product.sku,
        product_name: product.product_name,
        price: product.price,
        brand: product.brand,
        quantity: product.quantity ?? 1,
      });
    },
    [trackEvent]
  );

  // Checkout started
  const trackCheckoutStarted = useCallback(
    (cartValue: number, itemCount: number) => {
      trackEvent('bob_checkout_started', {
        cart_value: cartValue,
        item_count: itemCount,
      });
    },
    [trackEvent]
  );

  // Speech played
  const trackSpeechPlayed = useCallback(
    (textLength: number) => {
      // Estimate duration: ~150 words/min, ~5 chars/word
      const estimatedDuration = Math.ceil((textLength / 5) / 150 * 60);
      trackEvent('bob_speech_played', {
        text_length: textLength,
        duration_estimate: estimatedDuration,
      });
    },
    [trackEvent]
  );

  // Speech failed
  const trackSpeechFailed = useCallback(
    (textLength: number) => {
      trackEvent('bob_speech_failed', {
        text_length: textLength,
      });
    },
    [trackEvent]
  );

  // Error
  const trackError = useCallback(
    (errorType: string, errorMessage: string) => {
      trackEvent('bob_error', {
        error_type: errorType,
        error_message: errorMessage,
      });
    },
    [trackEvent]
  );

  // Conversation activity tracking (debounced upsert to bob_conversations)
  const trackConversationActivity = useCallback(
    (extras?: {
      had_product_match?: boolean;
      led_to_cart?: boolean;
      vehicle_id?: string;
      rego?: string;
    }) => {
      if (!enabled || !bobSupabaseUrl || !bobSupabaseKey) return;

      // For led_to_cart or had_product_match, fire immediately
      const immediate = extras?.led_to_cart || extras?.had_product_match;

      const fire = () => {
        pendingConversationRef.current = false;
        const payload = {
          session_id: sessionIdRef.current,
          user_id: hostContext?.user?.id || null,
          channel: 'web',
          vehicle_id: extras?.vehicle_id || hostContext?.vehicle?.selectedVehicle?.vehicle_id?.toString() || null,
          rego: extras?.rego || hostContext?.vehicle?.selectedVehicle?.rego || null,
          had_product_match: extras?.had_product_match || false,
          led_to_cart: extras?.led_to_cart || false,
        };

        fetch(`${bobSupabaseUrl}/functions/v1/bob-conversation-track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: bobSupabaseKey,
          },
          body: JSON.stringify(payload),
        }).catch((err) => {
          console.warn('[BobAnalytics] Conversation track failed:', err);
        });
      };

      if (immediate) {
        if (conversationTrackTimerRef.current) {
          clearTimeout(conversationTrackTimerRef.current);
          conversationTrackTimerRef.current = null;
        }
        fire();
        return;
      }

      // Debounce regular message tracking
      if (!pendingConversationRef.current) {
        pendingConversationRef.current = true;
        conversationTrackTimerRef.current = setTimeout(fire, CONVERSATION_TRACK_DEBOUNCE_MS);
      }
    },
    [enabled, bobSupabaseUrl, bobSupabaseKey, hostContext]
  );

  // Auto-track session start on mount
  useEffect(() => {
    trackSessionStart();
  }, [trackSessionStart]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (conversationTrackTimerRef.current) {
        clearTimeout(conversationTrackTimerRef.current);
      }
    };
  }, []);

  return {
    trackEvent,
    sessionId: sessionIdRef.current,
    trackSessionStart,
    trackMessageSent,
    trackVehicleIdentified,
    trackPartsViewed,
    trackProductClicked,
    trackProductViewed,
    trackAddToCart,
    trackCheckoutStarted,
    trackSpeechPlayed,
    trackSpeechFailed,
    trackError,
    trackConversationActivity,
  };
}

export default useBobAnalytics;
