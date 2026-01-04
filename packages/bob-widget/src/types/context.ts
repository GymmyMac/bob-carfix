/**
 * Host context types for multi-tenant Bob widget integration
 */

export interface HostUserContext {
  /** User's unique identifier in the host system */
  id?: string;
  /** User's email address */
  email?: string;
  /** User's display name */
  name?: string;
  /** User's phone number */
  phone?: string;
  /** Whether user is authenticated */
  isAuthenticated?: boolean;
}

export interface Vehicle {
  id?: number;
  vehicle_id?: number | string;
  rego?: string;
  make?: string;
  model?: string;
  year?: string | number;
  variant?: string;
  engine_size?: string;
  cc_rating?: number;
  fuel_type?: string;
  vin?: string;
  engine_no?: string;
  vehicle_name_nz?: string;
}

export interface HostVehicleContext {
  /** Currently selected/confirmed vehicle */
  selectedVehicle?: Vehicle;
  /** All vehicles in user's garage */
  garageVehicles?: Vehicle[];
  /** Recent vehicle searches */
  recentSearches?: Vehicle[];
}

export interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  vehicle_id?: string;
  sku?: string;
  brand?: string;
  image_url?: string;
}

export interface SavedItem {
  product_id: string;
  product_name: string;
  saved_at: string;
  vehicle_id?: string;
}

export interface HostCartContext {
  /** Current cart contents */
  items?: CartItem[];
  /** Wishlist/saved items */
  savedItems?: SavedItem[];
  /** Total cart value */
  totalValue?: number;
  /** Number of items in cart */
  itemCount?: number;
}

export interface PurchaseRecord {
  order_id: string;
  order_date: string;
  total: number;
  items: CartItem[];
  vehicle_id?: string;
}

export interface HostHistoryContext {
  /** Past purchase history */
  purchases?: PurchaseRecord[];
  /** Date of last order */
  lastOrderDate?: string;
  /** Total lifetime spend */
  lifetimeSpend?: number;
}

/**
 * Complete host context passed to Bob widget
 */
export interface HostContext {
  /** User information from host system */
  user?: HostUserContext;
  /** Vehicle information from host system */
  vehicle?: HostVehicleContext;
  /** Cart information from host system */
  cart?: HostCartContext;
  /** Purchase history from host system */
  history?: HostHistoryContext;
  /** Current page/route on host site */
  currentPage?: string;
  /** Custom metadata from host */
  metadata?: Record<string, unknown>;
}

/**
 * Bob's Supabase configuration (for animations, settings, TTS)
 */
export interface BobConfig {
  /** Bob's Supabase project URL */
  supabaseUrl: string;
  /** Bob's Supabase anon/public key */
  supabaseKey: string;
}

/**
 * Host's API configuration for product/vehicle lookups
 */
export interface HostApiConfig {
  /** Base URL for host's API (e.g., 'https://api.partshub.io') */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Optional partner code identifier */
  partnerCode?: string;
  /** Optional custom headers */
  customHeaders?: Record<string, string>;
}

/**
 * Layout configuration for host navigation awareness
 */
export interface BobLayoutConfig {
  /** Bottom offset in pixels for host navigation bars (e.g., 60 for CARFIX bottom nav) */
  bottomOffset?: number;
  /** Base z-index for Bob's UI elements. Default: 50 */
  zIndexBase?: number;
}

// Import analytics event type
import type { BobAnalyticsEvent } from './analytics';

/**
 * Callbacks for Bob events that the host can handle
 */
export interface BobCallbacks {
  /** Called when a vehicle is identified/confirmed */
  onVehicleIdentified?: (vehicle: Vehicle) => void;
  /** Called when parts are found for a vehicle */
  onPartsFound?: (parts: unknown[]) => void;
  /** Called when service packages are found */
  onServicePackagesFound?: (packages: unknown[]) => void;
  /** Called when user wants to add item to cart */
  onAddToCart?: (item: CartItem) => void;
  /** Called when cart is updated */
  onCartUpdated?: (cart: { items: CartItem[]; total: number }) => void;
  /** Called when checkout is requested */
  onCheckoutRequested?: (checkoutUrl: string) => void;
  /** Called when Bob sends a message */
  onBobMessage?: (message: string) => void;
  /** Called when user clicks a product to view full details page */
  onNavigateToProductPage?: (product: unknown) => void;
  /** Called on any error */
  onError?: (error: Error) => void;
  /** Called for every trackable event - for server-side analytics */
  onAnalyticsEvent?: (event: BobAnalyticsEvent) => void;
}

/**
 * Complete configuration for BobProvider
 */
export interface BobProviderConfig {
  /** Bob's Supabase configuration */
  bobConfig: BobConfig;
  /** Host's API configuration */
  hostApiConfig: HostApiConfig;
  /** Initial host context */
  hostContext?: HostContext;
  /** Event callbacks */
  callbacks?: BobCallbacks;
}
