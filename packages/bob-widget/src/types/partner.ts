/**
 * Partner configuration types for Bob Standalone v3.1.0
 * Partners auto-load config from database - minimal host-side setup required
 */

/**
 * Feature flags for partner-specific behavior
 */
export interface PartnerFeatureFlags {
  /** Show service package bundles on product shelf */
  showServicePackages?: boolean;
  /** Enable text-to-speech for Bob responses */
  enableTTS?: boolean;
  /** Enable speech recognition for voice input */
  enableSpeechRecognition?: boolean;
  /** Show debug overlay with diagnostic info */
  showDebugOverlay?: boolean;
}

/**
 * Partner configuration stored in bob_partners table
 */
export interface PartnerConfig {
  id: string;
  partner_code: string;
  display_name: string;
  
  // API Configuration
  api_base_url: string;
  api_key_secret_name?: string;
  
  // Bob's Supabase credentials
  bob_supabase_url: string;
  bob_supabase_key: string;
  
  // Layout preferences
  default_bottom_offset: number;
  default_z_index_base: number;
  backdrop_blur_intensity: number;
  backdrop_overlay_opacity: number;
  
  // Security
  allowed_origins: string[];
  
  // Feature flags
  feature_flags: PartnerFeatureFlags;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Essential callbacks for v3.1.0 simplified interface
 * Only what the host MUST handle - everything else is internalized
 */
export interface EssentialCallbacks {
  /** Called when user wants to add item to cart - REQUIRED for e-commerce */
  onAddToCart?: (item: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    sku?: string;
    brand?: string;
    image_url?: string;
    vehicle_id?: string;
  }) => void;
  
  /** Called for SPA navigation within host site */
  onNavigate?: (url: string) => void;
  
  /** Called when checkout is ready */
  onCheckout?: (checkoutUrl: string) => void;
  
  /** Called on error (optional - Bob shows toast by default) */
  onError?: (error: Error) => void;
}

/**
 * Simplified props for v3.1.0 partner integration
 */
export interface StandaloneWidgetProps {
  /** Partner code - loads all config from database */
  partner: string;
  
  /** Optional session token for pre-authenticated sessions */
  sessionToken?: string;
  
  /** Override bottom offset from database default */
  bottomOffset?: number;
  
  /** Override z-index base from database default */
  zIndexBase?: number;
  
  /** Override backdrop blur intensity (0-20) */
  backdropBlurIntensity?: number;
  
  /** Override backdrop overlay opacity (0-1) */
  backdropOverlayOpacity?: number;
  
  /** Essential callbacks - only what host MUST handle */
  onAddToCart?: EssentialCallbacks['onAddToCart'];
  onNavigate?: EssentialCallbacks['onNavigate'];
  onCheckout?: EssentialCallbacks['onCheckout'];
  onError?: EssentialCallbacks['onError'];
  
  /** Enable debug mode overlay */
  debug?: boolean;
  
  /** Additional CSS class for container */
  className?: string;
  
  /** Optional pre-identified vehicle — Bob skips REGO lookup and goes straight to parts */
  initialVehicle?: {
    vehicle_id: string | number;
    make: string;
    model: string;
    year: number;
    [key: string]: unknown;
  };
}
