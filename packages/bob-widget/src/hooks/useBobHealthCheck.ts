import { useBobSupabaseSafe } from "../BobProvider";

export interface BobHealthCheckResult {
  healthy: boolean;
  reason?: string;
  activeLookId?: string;
  activeLookName?: string;
  stateCount: number;
  states: string[];
  missingCritical: string[];
  frameCount: number;
}

/**
 * Health check hook for verifying Bob's animation system connectivity.
 * Use this to diagnose issues with animation state loading on external sites.
 * 
 * @example
 * ```tsx
 * const { checkHealth } = useBobHealthCheck();
 * 
 * useEffect(() => {
 *   checkHealth().then(result => {
 *     if (!result.healthy) {
 *       console.error('Bob health check failed:', result.reason);
 *     }
 *   });
 * }, []);
 * ```
 */
export const useBobHealthCheck = () => {
  const supabase = useBobSupabaseSafe();

  const checkHealth = async (): Promise<BobHealthCheckResult> => {
    if (!supabase) {
      return {
        healthy: false,
        reason: 'No Supabase client available - ensure BobProvider is configured',
        stateCount: 0,
        states: [],
        missingCritical: ['idle', 'talking', 'listening'],
        frameCount: 0,
      };
    }

    try {
      // Fetch active look
      const { data: looks, error: looksError } = await supabase
        .from('bob_looks')
        .select('id, name, is_active')
        .eq('is_active', true)
        .limit(1);

      if (looksError) {
        return {
          healthy: false,
          reason: `Database error fetching looks: ${looksError.message}`,
          stateCount: 0,
          states: [],
          missingCritical: ['idle', 'talking', 'listening'],
          frameCount: 0,
        };
      }

      const activeLook = looks?.[0];
      if (!activeLook) {
        return {
          healthy: false,
          reason: 'No active look configured in bob_looks table',
          stateCount: 0,
          states: [],
          missingCritical: ['idle', 'talking', 'listening'],
          frameCount: 0,
        };
      }

      // Fetch states for active look
      const { data: states, error: statesError } = await supabase
        .from('animation_states')
        .select('state_key')
        .eq('is_active', true)
        .eq('look_id', activeLook.id);

      if (statesError) {
        return {
          healthy: false,
          reason: `Database error fetching states: ${statesError.message}`,
          activeLookId: activeLook.id,
          activeLookName: activeLook.name,
          stateCount: 0,
          states: [],
          missingCritical: ['idle', 'talking', 'listening'],
          frameCount: 0,
        };
      }

      const stateKeys = states?.map(s => s.state_key) || [];

      // Check for critical states (with flexible matching)
      const criticalStates = ['idle', 'talking', 'listening'];
      const missingCritical = criticalStates.filter(key => {
        const variations = [key, key.replace('ing', ''), key + 'ing'];
        return !stateKeys.some(sk => variations.includes(sk));
      });

      // Fetch animation frames count
      const { data: frames, error: framesError } = await supabase
        .from('bob_animations')
        .select('id')
        .eq('is_active', true)
        .eq('look_id', activeLook.id);

      const frameCount = framesError ? 0 : (frames?.length || 0);

      const healthy = stateKeys.length >= 4 && frameCount > 0 && missingCritical.length === 0;

      return {
        healthy,
        reason: healthy ? undefined : `Missing critical states: ${missingCritical.join(', ')}`,
        activeLookId: activeLook.id,
        activeLookName: activeLook.name,
        stateCount: stateKeys.length,
        states: stateKeys,
        missingCritical,
        frameCount,
      };
    } catch (error) {
      return {
        healthy: false,
        reason: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`,
        stateCount: 0,
        states: [],
        missingCritical: ['idle', 'talking', 'listening'],
        frameCount: 0,
      };
    }
  };

  return { checkHealth };
};
