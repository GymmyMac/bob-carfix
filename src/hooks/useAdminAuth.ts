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

    const checkAdminStatus = async (user: User | null) => {
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
        const { data, error } = await supabase
          .rpc('has_role', { _user_id: user.id, _role: 'admin' });

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

    // Initial session check with timeout to prevent hanging
    const initAuth = async () => {
      console.log('[AdminAuth] Initializing auth check...');
      try {
        // Add timeout to prevent infinite loading in iframe environments
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        
        console.log('[AdminAuth] Session result:', result?.data?.session?.user?.email ?? 'no session');
        await checkAdminStatus(result?.data?.session?.user ?? null);
      } catch (error) {
        console.error('[AdminAuth] Session check failed:', error);
        // On timeout/error, treat as no session - will redirect to auth
        if (mounted) {
          setState({
            user: null,
            isAdmin: false,
            isLoading: false,
            error: null,
          });
        }
      }
    };

    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setState(prev => ({ ...prev, isLoading: true }));
          await checkAdminStatus(session?.user ?? null);
        }
      }
    );

    initAuth();

    return () => {
      mounted = false;
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
