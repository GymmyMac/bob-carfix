import React, { createContext, useContext, useMemo, useEffect, ReactNode } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BOB_VERSION } from './version';
import type {
  BobConfig,
  HostApiConfig,
  HostContext,
  BobCallbacks,
} from './types';
import type { BobGA4Config } from './types/analytics';
import { useBobAnalytics } from './hooks/useBobAnalytics';

/**
 * Internal context value structure
 */
interface BobContextValue {
  /** Bob's Supabase client for animations/settings */
  bobSupabase: SupabaseClient;
  /** Bob's configuration */
  bobConfig: BobConfig;
  /** Host's API configuration */
  hostApiConfig: HostApiConfig;
  /** Current host context */
  hostContext: HostContext;
  /** Event callbacks */
  callbacks: BobCallbacks;
  /** Update host context (for dynamic updates) */
  updateHostContext: (updates: Partial<HostContext>) => void;
  /** GA4 configuration */
  ga4Config?: BobGA4Config;
  /** Whether analytics is enabled */
  analyticsEnabled: boolean;
  /** Bottom offset in pixels for host navigation bars */
  bottomOffset: number;
  /** Base z-index for Bob's UI elements */
  zIndexBase: number;
}

const BobContext = createContext<BobContextValue | null>(null);

interface BobProviderProps {
  children: ReactNode;
  /** Bob's Supabase configuration */
  bobConfig: BobConfig;
  /** Host's API configuration for product/vehicle lookups */
  hostApiConfig: HostApiConfig;
  /** Initial host context from host's hooks */
  hostContext?: HostContext;
  /** Event callbacks */
  callbacks?: BobCallbacks;
  /** Optional external QueryClient - if not provided, an internal one is created */
  queryClient?: QueryClient;
  /** GA4 configuration for analytics */
  ga4Config?: BobGA4Config;
  /** Enable/disable analytics tracking */
  analyticsEnabled?: boolean;
  /** Bottom offset in pixels for host navigation bars */
  bottomOffset?: number;
  /** Base z-index for Bob's UI elements */
  zIndexBase?: number;
}

/**
 * BobProvider - Context provider for the Bob widget
 * 
 * Provides dual configuration:
 * 1. Bob's Supabase (for animations, settings, TTS) - read-only access
 * 2. Host's API config (for vehicle/product lookups) - uses host's credentials
 * 
 * @example
 * ```tsx
 * <BobProvider
 *   bobConfig={{
 *     supabaseUrl: 'https://gjoguxzstsihhxvdgpto.supabase.co',
 *     supabaseKey: 'eyJhbGciOiJI...',
 *   }}
 *   hostApiConfig={{
 *     baseUrl: 'https://api.partshub.io',
 *     apiKey: process.env.PARTNER_API_KEY!,
 *     partnerCode: 'CARFIX',
 *   }}
 *   hostContext={{
 *     user: { id: user?.id, email: user?.email },
 *     vehicle: { selectedVehicle: currentVehicle },
 *   }}
 *   callbacks={{
 *     onVehicleIdentified: (v) => saveVehicle(v),
 *     onAddToCart: (item) => addToCart(item),
 *   }}
 * >
 *   <Bob />
 * </BobProvider>
 * ```
 */
export function BobProvider({
  children,
  bobConfig,
  hostApiConfig,
  hostContext: initialHostContext = {},
  callbacks = {},
  queryClient: externalQueryClient,
  ga4Config,
  analyticsEnabled = true,
  bottomOffset = 0,
  zIndexBase = 50,
}: BobProviderProps) {
  // Create internal QueryClient if none provided
  const internalQueryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 5 * 60 * 1000,
          },
        },
      }),
    []
  );

  const activeQueryClient = externalQueryClient || internalQueryClient;
  const usingExternalClient = !!externalQueryClient;

  // Log startup info
  useEffect(() => {
    console.log(`[BobWidget] v${BOB_VERSION} initialized`);
    console.log(`[BobWidget] QueryClient: ${usingExternalClient ? 'external (shared)' : 'internal'}`);
    console.log(`[BobWidget] Analytics: ${analyticsEnabled ? 'enabled' : 'disabled'}`);
    if (ga4Config?.measurementId) {
      console.log(`[BobWidget] GA4: ${ga4Config.measurementId}`);
    }
  }, [usingExternalClient, analyticsEnabled, ga4Config?.measurementId]);

  // Create Bob's Supabase client (for animations, settings)
  const bobSupabase = useMemo(() => {
    return createClient(bobConfig.supabaseUrl, bobConfig.supabaseKey);
  }, [bobConfig.supabaseUrl, bobConfig.supabaseKey]);

  // Track host context with state for updates
  const [hostContext, setHostContext] = React.useState<HostContext>(initialHostContext);

  // Update host context when initial context changes (from host's hooks)
  React.useEffect(() => {
    setHostContext(initialHostContext);
  }, [initialHostContext]);

  // Function to update host context
  const updateHostContext = React.useCallback((updates: Partial<HostContext>) => {
    setHostContext((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const value = useMemo<BobContextValue>(
    () => ({
      bobSupabase,
      bobConfig,
      hostApiConfig,
      hostContext,
      callbacks,
      updateHostContext,
      ga4Config,
      analyticsEnabled,
      bottomOffset,
      zIndexBase,
    }),
    [bobSupabase, bobConfig, hostApiConfig, hostContext, callbacks, updateHostContext, ga4Config, analyticsEnabled, bottomOffset, zIndexBase]
  );

  return (
    <QueryClientProvider client={activeQueryClient}>
      <BobContext.Provider value={value}>{children}</BobContext.Provider>
    </QueryClientProvider>
  );
}

/**
 * Hook to access Bob context
 * Must be used within a BobProvider
 */
export function useBobContext(): BobContextValue {
  const context = useContext(BobContext);
  if (!context) {
    throw new Error('useBobContext must be used within a BobProvider');
  }
  return context;
}

/**
 * Hook to access Bob's Supabase client
 */
export function useBobSupabase(): SupabaseClient {
  const { bobSupabase } = useBobContext();
  return bobSupabase;
}

/**
 * Hook to safely access Bob's Supabase client
 * Returns null instead of throwing when used outside BobProvider
 * Use this in widget components that need to work without BobProvider
 */
export function useBobSupabaseSafe(): SupabaseClient | null {
  const context = useContext(BobContext);
  return context?.bobSupabase || null;
}

/**
 * Hook to access host context
 */
export function useHostContext(): HostContext {
  const { hostContext } = useBobContext();
  return hostContext;
}

/**
 * Hook to access host API config
 */
export function useHostApiConfig(): HostApiConfig {
  const { hostApiConfig } = useBobContext();
  return hostApiConfig;
}

/**
 * Hook to access Bob callbacks
 */
export function useBobCallbacks(): BobCallbacks {
  const { callbacks } = useBobContext();
  return callbacks;
}

/**
 * Hook to access GA4 config and analytics status
 */
export function useBobAnalyticsConfig(): { ga4Config?: BobGA4Config; enabled: boolean } {
  const { ga4Config, analyticsEnabled } = useBobContext();
  return { ga4Config, enabled: analyticsEnabled };
}

/**
 * Hook to access layout configuration (bottomOffset, zIndexBase)
 * Returns safe defaults when used outside BobProvider (for demo/standalone usage)
 */
export function useBobLayoutConfig(): { bottomOffset: number; zIndexBase: number } {
  const context = useContext(BobContext);
  // Gracefully fallback for standalone/demo usage
  if (!context) {
    return { bottomOffset: 0, zIndexBase: 50 };
  }
  return { bottomOffset: context.bottomOffset, zIndexBase: context.zIndexBase };
}

/**
 * Re-export the analytics hook with context wiring
 */
export { useBobAnalytics };

export default BobProvider;
