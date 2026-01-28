/**
 * usePartnerConfig - Auto-load partner configuration from database
 * 
 * Part of Bob Standalone v3.1.0 architecture
 * Partners only need to pass `partner="CARFIX"` - everything else is auto-loaded
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { PartnerConfig, PartnerFeatureFlags } from '../types/partner';

// Bob's default Supabase credentials (public, read-only access to config)
const BOB_DEFAULT_SUPABASE_URL = 'https://gjoguxzstsihhxvdgpto.supabase.co';
const BOB_DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqb2d1eHpzdHNpaGh4dmRncHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MzgyODEsImV4cCI6MjA3OTUxNDI4MX0.detu4TKB7RjC6l6CrVaPYoi0Hhz2asDt6zxNx1cdzq8';

export interface UsePartnerConfigResult {
  /** Loaded partner configuration */
  config: PartnerConfig | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if config failed to load */
  error: Error | null;
  /** Whether the current origin is allowed for this partner */
  isOriginAllowed: boolean;
  /** Supabase client configured for this partner */
  supabaseClient: SupabaseClient | null;
  /** Reload configuration */
  reload: () => Promise<void>;
}

/**
 * Check if current origin matches any allowed pattern
 */
function isOriginAllowed(allowedOrigins: string[], currentOrigin: string): boolean {
  return allowedOrigins.some(pattern => {
    // Handle wildcard patterns like https://*.carfix.co.nz
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`).test(currentOrigin);
    }
    return pattern === currentOrigin;
  });
}

/**
 * Hook to auto-load partner configuration from database
 * 
 * @param partnerCode - Partner identifier (e.g., "CARFIX")
 * @returns Partner configuration, loading state, and utilities
 * 
 * @example
 * ```tsx
 * const { config, isLoading, error, supabaseClient } = usePartnerConfig('CARFIX');
 * 
 * if (isLoading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 * 
 * // Use config for layout, features, etc.
 * const bottomOffset = config.default_bottom_offset;
 * ```
 */
export function usePartnerConfig(partnerCode: string | undefined): UsePartnerConfigResult {
  const [config, setConfig] = useState<PartnerConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAllowed, setIsAllowed] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);

  const loadConfig = useCallback(async () => {
    if (!partnerCode) {
      setIsLoading(false);
      setError(new Error('Partner code is required'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create temporary client with Bob's default credentials
      const tempClient = createClient(BOB_DEFAULT_SUPABASE_URL, BOB_DEFAULT_SUPABASE_KEY);

      console.log(`[BobWidget] Loading partner config for: ${partnerCode}`);

      const { data, error: queryError } = await tempClient
        .from('bob_partners')
        .select('*')
        .eq('partner_code', partnerCode)
        .eq('is_active', true)
        .maybeSingle();

      if (queryError) {
        throw new Error(`Failed to load partner config: ${queryError.message}`);
      }

      if (!data) {
        throw new Error(`Partner "${partnerCode}" not found or inactive`);
      }

      const partnerConfig = data as PartnerConfig;
      
      // Validate origin
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const allowed = isOriginAllowed(partnerConfig.allowed_origins || [], currentOrigin);
      
      if (!allowed && currentOrigin) {
        console.warn(`[BobWidget] Origin "${currentOrigin}" not in allowed origins for ${partnerCode}`);
        console.warn(`[BobWidget] Allowed origins:`, partnerConfig.allowed_origins);
      }

      // Create Supabase client with partner-specific credentials
      // v3.1.10: Use unique storage key to prevent auth collisions with host site
      const client = createClient(
        partnerConfig.bob_supabase_url || BOB_DEFAULT_SUPABASE_URL,
        partnerConfig.bob_supabase_key || BOB_DEFAULT_SUPABASE_KEY,
        {
          auth: {
            storageKey: `bobwidget_${partnerConfig.partner_code.toLowerCase()}`,
            persistSession: false,
            autoRefreshToken: false,
          }
        }
      );

      console.log(`[BobWidget] Partner config loaded:`, {
        partner: partnerConfig.partner_code,
        displayName: partnerConfig.display_name,
        bottomOffset: partnerConfig.default_bottom_offset,
        blurIntensity: partnerConfig.backdrop_blur_intensity,
        features: partnerConfig.feature_flags,
        originAllowed: allowed,
      });

      setConfig(partnerConfig);
      setIsAllowed(allowed);
      setSupabaseClient(client);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error loading partner config');
      console.error('[BobWidget] Partner config error:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [partnerCode]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    isLoading,
    error,
    isOriginAllowed: isAllowed,
    supabaseClient,
    reload: loadConfig,
  };
}

/**
 * Get feature flag value with default fallback
 */
export function getFeatureFlag<K extends keyof PartnerFeatureFlags>(
  config: PartnerConfig | null,
  flag: K,
  defaultValue: PartnerFeatureFlags[K]
): PartnerFeatureFlags[K] {
  if (!config?.feature_flags) return defaultValue;
  return config.feature_flags[flag] ?? defaultValue;
}

export default usePartnerConfig;
