import { useState, useEffect } from 'react';
import { supabase } from '@/lib/backend/client';
import type { User } from '@supabase/supabase-js';

interface AdminAuthState {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAdminAuth = () => {
  const [state, setState] = useState<AdminAuthState>({
    user: null,
    isAdmin: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    let authResolved = false;

    const checkAdminStatus = async (user: User | null, source: string) => {
      console.log(`[AdminAuth] checkAdminStatus from ${source}:`, user?.email ?? 'no user');
      
      if (!user) {
        if (mounted) {
          setState({
            user: null,
            isAdmin: false,
            isLoading: false,
            error: null,
          });
        }
        return;
      }

      try {
        // Use the has_role function to check admin status server-side
        console.log('[AdminAuth] Calling has_role RPC...');
        const { data, error } = await supabase
          .rpc('has_role', { _user_id: user.id, _role: 'admin' });

        console.log('[AdminAuth] has_role result:', { data, error: error?.message });

        if (error) {
          console.error('Error checking admin role:', error);
          if (mounted) {
            setState({
              user,
              isAdmin: false,
              isLoading: false,
              error: 'Failed to verify admin status',
            });
          }
          return;
        }

        if (mounted) {
          setState({
            user,
            isAdmin: data === true,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        console.error('Error in admin check:', err);
        if (mounted) {
          setState({
            user,
            isAdmin: false,
            isLoading: false,
            error: 'An error occurred',
          });
        }
      }
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
        await checkAdminStatus(session?.user ?? null, `onAuthStateChange:${event}`);
      }
    );

    // Fallback: if no auth event fires within 3 seconds, try getSession directly
    const fallbackTimeout = setTimeout(async () => {
      if (authResolved || !mounted) return;
      
      console.log('[AdminAuth] Fallback: no auth event received, trying getSession...');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && !authResolved) {
          await checkAdminStatus(session?.user ?? null, 'fallback:getSession');
        }
      } catch (error) {
        console.error('[AdminAuth] Fallback getSession failed:', error);
        if (mounted && !authResolved) {
          setState({
            user: null,
            isAdmin: false,
            isLoading: false,
            error: 'Session verification failed - try opening in a new tab',
          });
        }
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    ...state,
    signOut,
  };
};
