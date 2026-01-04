/**
 * Analytics types for Bob Widget GA4 integration
 */

/**
 * All trackable Bob events
 */
export type BobEventName =
  | 'bob_session_start'
  | 'bob_message_sent'
  | 'bob_vehicle_identified'
  | 'bob_parts_viewed'
  | 'bob_product_clicked'
  | 'bob_product_viewed'
  | 'bob_add_to_cart'
  | 'bob_checkout_started'
  | 'bob_speech_played'
  | 'bob_speech_failed'
  | 'bob_error';

/**
 * Analytics event structure sent to callbacks and GA4
 */
export interface BobAnalyticsEvent {
  /** Event name */
  event_name: BobEventName;
  /** ISO timestamp */
  timestamp: string;
  /** Session ID for grouping events */
  session_id: string;
  /** User email if available */
  user_email?: string;
  /** User ID if available */
  user_id?: string;
  /** Vehicle ID if available */
  vehicle_id?: string;
  /** Vehicle registration if available */
  rego?: string;
  /** Event-specific parameters */
  parameters: Record<string, unknown>;
}

/**
 * GA4 configuration options
 */
export interface BobGA4Config {
  /** GA4 Measurement ID (e.g., 'G-XXXXXXXXXX') */
  measurementId?: string;
  /** Enable debug mode for GA4 events */
  debug?: boolean;
}

/**
 * Parameters for session start event
 */
export interface SessionStartParams {
  widget_version: string;
  has_vehicle: boolean;
  has_user: boolean;
}

/**
 * Parameters for message sent event
 */
export interface MessageSentParams {
  message_length: number;
  has_vehicle: boolean;
}

/**
 * Parameters for vehicle identified event
 */
export interface VehicleIdentifiedParams {
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string | number;
  rego?: string;
}

/**
 * Parameters for parts viewed event
 */
export interface PartsViewedParams {
  part_count: number;
  vehicle_id?: string;
}

/**
 * Parameters for product interaction events
 */
export interface ProductParams {
  sku: string;
  product_name: string;
  price: number;
  brand?: string;
  quantity?: number;
}

/**
 * Parameters for checkout event
 */
export interface CheckoutParams {
  cart_value: number;
  item_count: number;
}

/**
 * Parameters for speech events
 */
export interface SpeechParams {
  text_length: number;
  duration_estimate?: number;
}

/**
 * Parameters for error events
 */
export interface ErrorParams {
  error_type: string;
  error_message: string;
}
