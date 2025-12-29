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
  }, [usingExternalClient]);

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
    }),
    [bobSupabase, bobConfig, hostApiConfig, hostContext, callbacks, updateHostContext]
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

export default BobProvider;
