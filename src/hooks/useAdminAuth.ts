import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/backend/client';
import type { User } from '@supabase/supabase-js';

// Admin status: 'unknown' means we haven't confirmed yet (timeout/error), not that user isn't admin
type AdminStatus = 'unknown' | 'admin' | 'not_admin';

interface AdminAuthState {
  user: User | null;
  adminStatus: AdminStatus;
  isLoading: boolean;
  error: string | null;
}

// Helper to create a timeout promise
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
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

export const useAdminAuth = () => {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    adminStatus: 'unknown',
    isLoading: true,
    error: null,
  });

  const checkAdminStatus = useCallback(async (user: User | null, source: string) => {
    console.log(`[AdminAuth] checkAdminStatus from ${source}:`, user?.email ?? 'no user');
    
    if (!user) {
      setState({
        user: null,
        adminStatus: 'unknown',
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      console.log('[AdminAuth] Checking admin role with retries...');
      
      // Use direct query to user_roles table (faster, more reliable than RPC)
      const checkRole = async (): Promise<boolean> => {
        // Build the query and execute it
        const query = supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .limit(1);
        
        const result = await withTimeout(
          Promise.resolve(query),
          ROLE_CHECK_TIMEOUT_MS,
          'Role check timed out'
        );

        if (result.error) {
          console.error('[AdminAuth] Direct role query failed:', result.error.message);
          // Fallback to RPC if direct query fails
          console.log('[AdminAuth] Trying RPC fallback...');
          const rpcQuery = supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
          const rpcResult = await withTimeout(
            Promise.resolve(rpcQuery),
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

      setState({
        user,
        adminStatus: isAdmin ? 'admin' : 'not_admin',
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('[AdminAuth] Error in admin check after retries:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      // On timeout/error, set status to 'unknown' (not 'not_admin')
      // User might still be admin, we just couldn't verify
      setState({
        user,
        adminStatus: 'unknown',
        isLoading: false,
        error: `${errorMessage}. Backend may be waking up - try again in a moment.`,
      });
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    console.log('[AdminAuth] refreshAuth called - re-checking auth status');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Try getSession with timeout first
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        AUTH_TIMEOUT_MS,
        'Session fetch timed out'
      );
      
      if (session?.user) {
        await checkAdminStatus(session.user, 'refreshAuth:getSession');
        return;
      }
      
      // Fallback: try getUser if no session
      console.log('[AdminAuth] No session, trying getUser...');
      const { data: { user } } = await withTimeout(
        supabase.auth.getUser(),
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
      });
    }
  }, [checkAdminStatus]);

  // Function to clear auth storage and retry
  const clearAuthAndRetry = useCallback(() => {
    console.log('[AdminAuth] Clearing auth storage and retrying...');
    
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
        
        setState(prev => ({ ...prev, isLoading: true }));
        await wrappedCheckAdminStatus(session?.user ?? null, `onAuthStateChange:${event}`);
      }
    );

    // Fallback: if no auth event fires within timeout, try getSession/getUser directly
    const fallbackTimeout = setTimeout(async () => {
      if (authResolved || !mounted) return;
      
      console.log('[AdminAuth] Fallback: no auth event received, trying getSession with timeout...');
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          'Session fetch timed out'
        );
        
        if (mounted && !authResolved) {
          if (session?.user) {
            await wrappedCheckAdminStatus(session.user, 'fallback:getSession');
          } else {
            // Try getUser as last resort
            console.log('[AdminAuth] Fallback: trying getUser...');
            const { data: { user } } = await withTimeout(
              supabase.auth.getUser(),
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
          });
        }
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  const signOut = async () => {
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
    signOut,
    refreshAuth,
    clearAuthAndRetry,
  };
};
