import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/backend/client';
import type { User } from '@supabase/supabase-js';

// Admin status: 'unknown' means we haven't confirmed yet (timeout/error), not that user isn't admin
type AdminStatus = 'unknown' | 'admin' | 'not_admin';

interface AdminAuthState {
  user: User | null;
  adminStatus: AdminStatus;
  isLoading: boolean;
  error: string | null;
  authStep: string; // For debugging
}

// Helper to create a timeout promise that properly races async operations
const withTimeout = <T>(
  asyncFn: () => Promise<T>,
  ms: number,
  errorMessage: string
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);

    asyncFn()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

// Retry with exponential backoff
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 300
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`[AdminAuth] Retry attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // 300ms, 600ms, 1200ms
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

const AUTH_TIMEOUT_MS = 5000;
const ROLE_CHECK_TIMEOUT_MS = 8000;
const HARD_WATCHDOG_MS = 15000; // Force error state after 15 seconds

export const useAdminAuth = () => {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    adminStatus: 'unknown',
    isLoading: true,
    error: null,
    authStep: 'initializing',
  });

  // Concurrency guard - only the latest check should update state
  const checkIdRef = useRef(0);
  // Cache confirmed admin status for the current session
  const confirmedAdminRef = useRef<{ userId: string; isAdmin: boolean } | null>(null);
  // Watchdog timer ref
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);

  // Reset watchdog whenever we exit loading state
  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  // Start watchdog when entering loading state
  const startWatchdog = useCallback(() => {
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      console.error('[AdminAuth] WATCHDOG: Auth verification exceeded 15s, forcing error state');
      setState(prev => ({
        ...prev,
        isLoading: false,
        adminStatus: prev.user ? 'unknown' : prev.adminStatus,
        error: 'Auth verification is taking too long. The backend may be unavailable.',
        authStep: 'watchdog_timeout',
      }));
    }, HARD_WATCHDOG_MS);
  }, [clearWatchdog]);

  const checkAdminStatus = useCallback(async (user: User | null, source: string) => {
    // Increment check ID for concurrency guard
    const thisCheckId = ++checkIdRef.current;
    console.log(`[AdminAuth] checkAdminStatus #${thisCheckId} from ${source}:`, user?.email ?? 'no user');
    
    const updateState = (newState: Partial<AdminAuthState>) => {
      // Only update if this is still the latest check
      if (checkIdRef.current !== thisCheckId) {
        console.log(`[AdminAuth] Check #${thisCheckId} superseded by #${checkIdRef.current}, skipping state update`);
        return;
      }
      setState(prev => ({ ...prev, ...newState }));
    };
    
    if (!user) {
      confirmedAdminRef.current = null;
      updateState({
        user: null,
        adminStatus: 'unknown',
        isLoading: false,
        error: null,
        authStep: 'no_user',
      });
      clearWatchdog();
      return;
    }

    // Fast path: if we already confirmed admin status for this user, use cache
    if (confirmedAdminRef.current?.userId === user.id) {
      console.log('[AdminAuth] Using cached admin status:', confirmedAdminRef.current.isAdmin);
      updateState({
        user,
        adminStatus: confirmedAdminRef.current.isAdmin ? 'admin' : 'not_admin',
        isLoading: false,
        error: null,
        authStep: 'cached',
      });
      clearWatchdog();
      return;
    }

    try {
      updateState({ authStep: 'checking_role' });
      console.log('[AdminAuth] Checking admin role with retries...');
      
      // Use direct query to user_roles table (faster, more reliable than RPC)
      const checkRole = async (): Promise<boolean> => {
        // Execute the query and await the actual network request
        const result = await withTimeout(
          async () => {
            const { data, error } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)
              .eq('role', 'admin')
              .limit(1);
            return { data, error };
          },
          ROLE_CHECK_TIMEOUT_MS,
          'Role check timed out'
        );

        if (result.error) {
          console.error('[AdminAuth] Direct role query failed:', result.error.message);
          // Fallback to RPC if direct query fails
          console.log('[AdminAuth] Trying RPC fallback...');
          const rpcResult = await withTimeout(
            async () => {
              const { data, error } = await supabase.rpc('has_role', { 
                _user_id: user.id, 
                _role: 'admin' 
              });
              return { data, error };
            },
            ROLE_CHECK_TIMEOUT_MS,
            'RPC role check timed out'
          );
          
          if (rpcResult.error) throw rpcResult.error;
          return rpcResult.data === true;
        }

        return (result.data?.length ?? 0) > 0;
      };

      const isAdmin = await withRetry(checkRole, 3, 300);
      
      console.log('[AdminAuth] Admin check result:', isAdmin);

      // Cache the result
      confirmedAdminRef.current = { userId: user.id, isAdmin };

      updateState({
        user,
        adminStatus: isAdmin ? 'admin' : 'not_admin',
        isLoading: false,
        error: null,
        authStep: isAdmin ? 'confirmed_admin' : 'confirmed_not_admin',
      });
    } catch (err) {
      console.error('[AdminAuth] Error in admin check after retries:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      // On timeout/error, set status to 'unknown' (not 'not_admin')
      // User might still be admin, we just couldn't verify
      updateState({
        user,
        adminStatus: 'unknown',
        isLoading: false,
        error: `${errorMessage}. Backend may be waking up - try again in a moment.`,
        authStep: 'role_check_failed',
      });
    } finally {
      // Always clear watchdog when check completes
      if (checkIdRef.current === thisCheckId) {
        clearWatchdog();
      }
    }
  }, [clearWatchdog]);

  const refreshAuth = useCallback(async () => {
    console.log('[AdminAuth] refreshAuth called - re-checking auth status');
    // Clear cache to force re-check
    confirmedAdminRef.current = null;
    setState(prev => ({ ...prev, isLoading: true, error: null, authStep: 'refreshing' }));
    startWatchdog();
    
    try {
      setState(prev => ({ ...prev, authStep: 'getting_session' }));
      // Try getSession with timeout first
      const { data: { session } } = await withTimeout(
        () => supabase.auth.getSession(),
        AUTH_TIMEOUT_MS,
        'Session fetch timed out'
      );
      
      if (session?.user) {
        await checkAdminStatus(session.user, 'refreshAuth:getSession');
        return;
      }
      
      // Fallback: try getUser if no session
      console.log('[AdminAuth] No session, trying getUser...');
      setState(prev => ({ ...prev, authStep: 'getting_user' }));
      const { data: { user } } = await withTimeout(
        () => supabase.auth.getUser(),
        AUTH_TIMEOUT_MS,
        'User fetch timed out'
      );
      
      await checkAdminStatus(user, 'refreshAuth:getUser');
    } catch (error) {
      console.error('[AdminAuth] refreshAuth failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh authentication';
      setState({
        user: null,
        adminStatus: 'unknown',
        isLoading: false,
        error: errorMessage,
        authStep: 'refresh_failed',
      });
      clearWatchdog();
    }
  }, [checkAdminStatus, startWatchdog, clearWatchdog]);

  // Function to clear auth storage and retry
  const clearAuthAndRetry = useCallback(() => {
    console.log('[AdminAuth] Clearing auth storage and retrying...');
    confirmedAdminRef.current = null;
    
    // Clear all supabase auth keys from localStorage
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log('[AdminAuth] Cleared localStorage keys:', keysToRemove);
    } catch (e) {
      console.warn('[AdminAuth] Could not clear localStorage:', e);
    }
    
    // Clear sessionStorage too
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      console.log('[AdminAuth] Cleared sessionStorage keys:', keysToRemove);
    } catch (e) {
      console.warn('[AdminAuth] Could not clear sessionStorage:', e);
    }
    
    // Sign out and reload
    supabase.auth.signOut().finally(() => {
      window.location.reload();
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    let authResolved = false;

    // Start watchdog timer
    startWatchdog();

    const wrappedCheckAdminStatus = async (user: User | null, source: string) => {
      if (!mounted) return;
      await checkAdminStatus(user, source);
    };

    // Set up auth state listener FIRST - this is the primary resolution method
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AdminAuth] onAuthStateChange:', event, session?.user?.email ?? 'no session');
        
        if (!mounted) return;
        
        // Mark auth as resolved on any definitive event
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          authResolved = true;
        }

        // For TOKEN_REFRESHED, only re-check if user changed
        if (event === 'TOKEN_REFRESHED') {
          const currentUserId = session?.user?.id;
          const cachedUserId = confirmedAdminRef.current?.userId;
          if (currentUserId && currentUserId === cachedUserId) {
            console.log('[AdminAuth] TOKEN_REFRESHED for same user, skipping re-check');
            // Just update user object without loading state
            setState(prev => ({ 
              ...prev, 
              user: session?.user ?? null,
              authStep: 'token_refreshed',
            }));
            return;
          }
        }
        
        setState(prev => ({ ...prev, isLoading: true, authStep: `auth_event:${event}` }));
        startWatchdog();
        await wrappedCheckAdminStatus(session?.user ?? null, `onAuthStateChange:${event}`);
      }
    );

    // Fallback: if no auth event fires within timeout, try getSession/getUser directly
    const fallbackTimeout = setTimeout(async () => {
      if (authResolved || !mounted) return;
      
      console.log('[AdminAuth] Fallback: no auth event received, trying getSession with timeout...');
      setState(prev => ({ ...prev, authStep: 'fallback_getSession' }));
      
      try {
        const { data: { session } } = await withTimeout(
          () => supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          'Session fetch timed out'
        );
        
        if (mounted && !authResolved) {
          if (session?.user) {
            await wrappedCheckAdminStatus(session.user, 'fallback:getSession');
          } else {
            // Try getUser as last resort
            console.log('[AdminAuth] Fallback: trying getUser...');
            setState(prev => ({ ...prev, authStep: 'fallback_getUser' }));
            const { data: { user } } = await withTimeout(
              () => supabase.auth.getUser(),
              AUTH_TIMEOUT_MS,
              'User fetch timed out'
            );
            await wrappedCheckAdminStatus(user, 'fallback:getUser');
          }
        }
      } catch (error) {
        console.error('[AdminAuth] Fallback failed:', error);
        if (mounted && !authResolved) {
          const errorMessage = error instanceof Error ? error.message : 'Session verification failed';
          setState({
            user: null,
            adminStatus: 'unknown',
            isLoading: false,
            error: `${errorMessage} - try clearing your browser data or opening in a new tab`,
            authStep: 'fallback_failed',
          });
          clearWatchdog();
        }
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      clearWatchdog();
      subscription.unsubscribe();
    };
  }, [checkAdminStatus, startWatchdog, clearWatchdog]);

  const signOut = async () => {
    confirmedAdminRef.current = null;
    await supabase.auth.signOut();
  };

  // Derived values for backward compatibility
  const isAdmin = state.adminStatus === 'admin';
  const isAdminStatusUnknown = state.adminStatus === 'unknown' && state.user !== null;

  return {
    user: state.user,
    isAdmin,
    adminStatus: state.adminStatus,
    isAdminStatusUnknown,
    isLoading: state.isLoading,
    error: state.error,
    authStep: state.authStep,
    signOut,
    refreshAuth,
    clearAuthAndRetry,
  };
};
