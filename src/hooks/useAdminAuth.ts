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

interface DiagnosticResult {
  authed: boolean;
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
  reason: string;
  timestamp: string;
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
  maxRetries: number = 2,
  baseDelay: number = 200
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`[AdminAuth] Retry attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// Emit telemetry event for debugging production issues
const emitTelemetry = async (
  event: string, 
  details: Record<string, unknown>
) => {
  try {
    const payload = {
      event_name: `admin_auth_${event}`,
      session_id: `admin_${Date.now()}`,
      parameters: {
        ...details,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      },
    };
    
    // Fire and forget - don't await, don't block auth flow
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bob-analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => { /* ignore telemetry failures */ });
    
    console.log(`[AdminAuth:Telemetry] ${event}:`, details);
  } catch {
    // Telemetry should never break auth flow
  }
};

const AUTH_TIMEOUT_MS = 5000;
const DIAGNOSTIC_TIMEOUT_MS = 8000;
const HARD_WATCHDOG_MS = 12000; // Reduced from 15s

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
      console.error('[AdminAuth] WATCHDOG: Auth verification exceeded timeout, forcing error state');
      emitTelemetry('watchdog_timeout', { step: state.authStep });
      setState(prev => ({
        ...prev,
        isLoading: false,
        adminStatus: prev.user ? 'unknown' : prev.adminStatus,
        error: 'Auth verification is taking too long. Please clear auth data and retry.',
        authStep: 'watchdog_timeout',
      }));
    }, HARD_WATCHDOG_MS);
  }, [clearWatchdog, state.authStep]);

  // Server-validated admin check using the diagnostic endpoint
  const checkAdminViaServer = useCallback(async (accessToken: string): Promise<DiagnosticResult | null> => {
    try {
      const response = await withTimeout(
        async () => {
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth-diagnostic`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );
          return res.json();
        },
        DIAGNOSTIC_TIMEOUT_MS,
        'Server diagnostic timed out'
      );
      return response as DiagnosticResult;
    } catch (error) {
      console.error('[AdminAuth] Server diagnostic failed:', error);
      return null;
    }
  }, []);

  const checkAdminStatus = useCallback(async (user: User | null, source: string, accessToken?: string) => {
    // Increment check ID for concurrency guard
    const thisCheckId = ++checkIdRef.current;
    console.log(`[AdminAuth] checkAdminStatus #${thisCheckId} from ${source}:`, user?.email ?? 'no user');
    emitTelemetry('check_start', { source, userId: user?.id, checkId: thisCheckId });
    
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
      emitTelemetry('check_complete', { result: 'no_user', checkId: thisCheckId });
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
      emitTelemetry('check_complete', { result: 'cached', isAdmin: confirmedAdminRef.current.isAdmin, checkId: thisCheckId });
      return;
    }

    try {
      updateState({ authStep: 'server_diagnostic' });

      // PRIMARY: Use server-validated diagnostic endpoint
      if (accessToken) {
        const diagnostic = await checkAdminViaServer(accessToken);
        
        if (diagnostic) {
          emitTelemetry('diagnostic_result', { 
            authed: diagnostic.authed, 
            isAdmin: diagnostic.isAdmin, 
            reason: diagnostic.reason,
            checkId: thisCheckId 
          });

          // Handle invalid/revoked token
          if (!diagnostic.authed) {
            console.log('[AdminAuth] Token invalid/revoked, forcing sign out');
            confirmedAdminRef.current = null;
            await supabase.auth.signOut();
            updateState({
              user: null,
              adminStatus: 'unknown',
              isLoading: false,
              error: 'Session expired. Please sign in again.',
              authStep: 'token_revoked',
            });
            clearWatchdog();
            return;
          }

          // Token valid - cache and return result
          confirmedAdminRef.current = { userId: user.id, isAdmin: diagnostic.isAdmin };
          updateState({
            user,
            adminStatus: diagnostic.isAdmin ? 'admin' : 'not_admin',
            isLoading: false,
            error: null,
            authStep: diagnostic.isAdmin ? 'server_confirmed_admin' : 'server_confirmed_not_admin',
          });
          clearWatchdog();
          return;
        }
      }

      // FALLBACK: Direct client query if server diagnostic unavailable
      updateState({ authStep: 'client_role_check' });
      console.log('[AdminAuth] Server diagnostic unavailable, falling back to client query...');
      emitTelemetry('fallback_client', { reason: 'server_unavailable', checkId: thisCheckId });
      
      const checkRole = async (): Promise<boolean> => {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .limit(1);

        if (error) {
          console.error('[AdminAuth] Direct role query failed:', error.message);
          throw error;
        }

        return (data?.length ?? 0) > 0;
      };

      const isAdmin = await withRetry(checkRole, 2, 200);
      
      console.log('[AdminAuth] Client admin check result:', isAdmin);
      confirmedAdminRef.current = { userId: user.id, isAdmin };

      updateState({
        user,
        adminStatus: isAdmin ? 'admin' : 'not_admin',
        isLoading: false,
        error: null,
        authStep: isAdmin ? 'client_confirmed_admin' : 'client_confirmed_not_admin',
      });
      emitTelemetry('check_complete', { result: 'client', isAdmin, checkId: thisCheckId });
    } catch (err) {
      console.error('[AdminAuth] Error in admin check:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      emitTelemetry('check_error', { error: errorMessage, checkId: thisCheckId });
      
      updateState({
        user,
        adminStatus: 'unknown',
        isLoading: false,
        error: `${errorMessage}. Try clearing auth data.`,
        authStep: 'role_check_failed',
      });
    } finally {
      if (checkIdRef.current === thisCheckId) {
        clearWatchdog();
      }
    }
  }, [clearWatchdog, checkAdminViaServer]);

  const refreshAuth = useCallback(async () => {
    console.log('[AdminAuth] refreshAuth called - re-checking auth status');
    emitTelemetry('refresh_start', {});
    
    confirmedAdminRef.current = null;
    setState(prev => ({ ...prev, isLoading: true, error: null, authStep: 'refreshing' }));
    startWatchdog();
    
    try {
      setState(prev => ({ ...prev, authStep: 'getting_session' }));
      const { data: { session } } = await withTimeout(
        () => supabase.auth.getSession(),
        AUTH_TIMEOUT_MS,
        'Session fetch timed out'
      );
      
      if (session?.user && session?.access_token) {
        await checkAdminStatus(session.user, 'refreshAuth:getSession', session.access_token);
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
      
      // If we have user but no access token, we need to get session again
      if (user) {
        const { data: { session: newSession } } = await supabase.auth.getSession();
        await checkAdminStatus(user, 'refreshAuth:getUser', newSession?.access_token);
      } else {
        await checkAdminStatus(null, 'refreshAuth:noUser');
      }
    } catch (error) {
      console.error('[AdminAuth] refreshAuth failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh authentication';
      emitTelemetry('refresh_error', { error: errorMessage });
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
    emitTelemetry('clear_and_retry', {});
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
    emitTelemetry('init', { timestamp: new Date().toISOString() });

    const wrappedCheckAdminStatus = async (user: User | null, source: string, accessToken?: string) => {
      if (!mounted) return;
      await checkAdminStatus(user, source, accessToken);
    };

    // Set up auth state listener FIRST - this is the primary resolution method
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AdminAuth] onAuthStateChange:', event, session?.user?.email ?? 'no session');
        emitTelemetry('auth_event', { event, hasSession: !!session, hasUser: !!session?.user });
        
        if (!mounted) return;
        
        // Mark auth as resolved on any definitive event
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          authResolved = true;
        }

        // Handle token refresh for same user - skip re-check
        if (event === 'TOKEN_REFRESHED') {
          const currentUserId = session?.user?.id;
          const cachedUserId = confirmedAdminRef.current?.userId;
          if (currentUserId && currentUserId === cachedUserId) {
            console.log('[AdminAuth] TOKEN_REFRESHED for same user, skipping re-check');
            setState(prev => ({ 
              ...prev, 
              user: session?.user ?? null,
              authStep: 'token_refreshed',
            }));
            return;
          }
        }

        // Handle signed out or no session
        if (event === 'SIGNED_OUT' || !session) {
          confirmedAdminRef.current = null;
          setState({
            user: null,
            adminStatus: 'unknown',
            isLoading: false,
            error: null,
            authStep: 'signed_out',
          });
          clearWatchdog();
          return;
        }
        
        setState(prev => ({ ...prev, isLoading: true, authStep: `auth_event:${event}` }));
        startWatchdog();
        await wrappedCheckAdminStatus(session?.user ?? null, `onAuthStateChange:${event}`, session?.access_token);
      }
    );

    // Fallback: if no auth event fires within timeout, try getSession directly
    const fallbackTimeout = setTimeout(async () => {
      if (authResolved || !mounted) return;
      
      console.log('[AdminAuth] Fallback: no auth event received, trying getSession...');
      emitTelemetry('fallback_trigger', { reason: 'no_auth_event' });
      setState(prev => ({ ...prev, authStep: 'fallback_getSession' }));
      
      try {
        const { data: { session } } = await withTimeout(
          () => supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          'Session fetch timed out'
        );
        
        if (mounted && !authResolved) {
          if (session?.user && session?.access_token) {
            await wrappedCheckAdminStatus(session.user, 'fallback:getSession', session.access_token);
          } else {
            // No session at all
            setState({
              user: null,
              adminStatus: 'unknown',
              isLoading: false,
              error: null,
              authStep: 'fallback_no_session',
            });
            clearWatchdog();
          }
        }
      } catch (error) {
        console.error('[AdminAuth] Fallback failed:', error);
        if (mounted && !authResolved) {
          const errorMessage = error instanceof Error ? error.message : 'Session verification failed';
          emitTelemetry('fallback_error', { error: errorMessage });
          setState({
            user: null,
            adminStatus: 'unknown',
            isLoading: false,
            error: `${errorMessage} - try clearing auth data`,
            authStep: 'fallback_failed',
          });
          clearWatchdog();
        }
      }
    }, 2500); // Reduced from 3000ms

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      clearWatchdog();
      subscription.unsubscribe();
    };
  }, [checkAdminStatus, startWatchdog, clearWatchdog]);

  const signOut = async () => {
    emitTelemetry('sign_out', {});
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
