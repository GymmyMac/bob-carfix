import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/backend/client';
import type { User } from '@supabase/supabase-js';

interface AdminAuthState {
  user: User | null;
  isAdmin: boolean;
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

const AUTH_TIMEOUT_MS = 5000;
const ROLE_CHECK_TIMEOUT_MS = 5000;

export const useAdminAuth = () => {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    isAdmin: false,
    isLoading: true,
    error: null,
  });

  const checkAdminStatus = useCallback(async (user: User | null, source: string) => {
    console.log(`[AdminAuth] checkAdminStatus from ${source}:`, user?.email ?? 'no user');
    
    if (!user) {
      setState({
        user: null,
        isAdmin: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      console.log('[AdminAuth] Calling has_role RPC with timeout...');
      
      // Create the RPC call - wrap in Promise.resolve to ensure it's a proper Promise
      const rpcPromise = Promise.resolve(
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' })
      );
      
      const { data, error } = await withTimeout(
        rpcPromise,
        ROLE_CHECK_TIMEOUT_MS,
        'Role check timed out'
      );

      console.log('[AdminAuth] has_role result:', { data, error: error?.message });

      if (error) {
        console.error('Error checking admin role:', error);
        setState({
          user,
          isAdmin: false,
          isLoading: false,
          error: 'Failed to verify admin status',
        });
        return;
      }

      setState({
        user,
        isAdmin: data === true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('[AdminAuth] Error in admin check:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setState({
        user,
        isAdmin: false,
        isLoading: false,
        error: errorMessage,
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
        isAdmin: false,
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
            isAdmin: false,
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

  return {
    ...state,
    signOut,
    refreshAuth,
    clearAuthAndRetry,
  };
};
