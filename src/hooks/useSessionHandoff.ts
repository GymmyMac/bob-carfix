import { useState, useEffect } from 'react';
import { Vehicle } from '@/types/vehicle';

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

const PARTNER_API_URL = 'https://flpzjbasdsfwoeruyxgp.supabase.co/functions/v1/partner-api';
const PARTNER_KEY = 'bob_carfix_p4rtner_2024_x7kL9mNqR3wY5vBc';

export function useSessionHandoff(): UseSessionHandoffResult {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('session');
    
    if (!token) {
      console.log('No session token in URL');
      return;
    }

    setSessionToken(token);
    console.log('Session token found:', token);

    const fetchSession = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(PARTNER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Partner-Key': PARTNER_KEY
          },
          body: JSON.stringify({
            action: 'get_session',
            session_token: token
          })
        });
        
        if (!response.ok) {
          throw new Error(`Session fetch failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          console.error('Session error:', data.error);
          setError(data.error);
          return;
        }
        
        console.log('Session data received:', data);
        console.log('Session vehicle:', data.vehicle);
        console.log('Session vehicle ID:', data.vehicle?.id || data.vehicle?.vehicle_id);
        
        // Map the response to our SessionData structure
        const mappedData: SessionData = {
          vehicle: data.vehicle,
          user_email: data.user_email || data.email,
          expires_at: data.expires_at
        };
        
        console.log('Mapped session data:', mappedData);
        
        setSessionData(mappedData);
        
        // Clean up URL by removing the session param (optional UX improvement)
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('session');
        window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
        
      } catch (err) {
        console.error('Failed to fetch session:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch session');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, []);

  return { sessionData, isLoading, error, sessionToken };
}
