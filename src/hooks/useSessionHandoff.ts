import { useState, useEffect } from 'react';
import { Vehicle } from '@/types/vehicle';
import { supabase } from '@/lib/backend/client';

interface SessionData {
  vehicle?: Vehicle;
  user_email?: string;
  expires_at?: string;
}

interface UseSessionHandoffResult {
  sessionData: SessionData | null;
  isLoading: boolean;
  error: string | null;
  sessionToken: string | null;
}

const STORAGE_TOKEN_KEY = 'carfix_session_token';
const STORAGE_DATA_KEY = 'carfix_session_data';

export function useSessionHandoff(): UseSessionHandoffResult {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('session');
    const tokenFromStorage = sessionStorage.getItem(STORAGE_TOKEN_KEY);
    const token = tokenFromUrl || tokenFromStorage;

    if (!token) {
      return;
    }

    setSessionToken(token);

    const fetchSession = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('session-handoff', {
          body: { session_token: token },
        });

        if (fnError) {
          throw fnError;
        }

        if (data?.error) {
          setError(data.error);
          return;
        }

        const mappedData: SessionData = {
          vehicle: data?.vehicle ?? undefined,
          user_email: data?.user_email ?? undefined,
          expires_at: data?.expires_at ?? undefined,
        };

        setSessionData(mappedData);

        // Persist for refreshes/navigation
        sessionStorage.setItem(STORAGE_TOKEN_KEY, token);
        sessionStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(mappedData));

        // Clean up URL by removing the session param (only if it came from URL)
        if (tokenFromUrl) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('session');
          window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch session';
        console.error('Failed to fetch session:', err);

        // Fallback to cached session data if available
        const cached = sessionStorage.getItem(STORAGE_DATA_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as SessionData;
            setSessionData(parsed);
          } catch {
            // ignore
          }
        }

        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, []);

  return { sessionData, isLoading, error, sessionToken };
}

