/**
 * Safe Supabase client that handles blocked storage in iframe contexts
 * This replaces direct imports from @/integrations/supabase/client
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { getSafeStorage } from './safeStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let supabaseInstance: SupabaseClient<Database> | null = null;

// No-op lock function for iframe environments where navigator.locks may hang
const noOpLock = async <R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> => {
  // Execute immediately without waiting for lock acquisition
  return fn();
};

function createSafeClient(): SupabaseClient<Database> {
  const { storage, type } = getSafeStorage();
  
  console.log('[SafeClient] Creating client with storage type:', type);
  
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      // Disable navigator.locks to prevent hanging in iframe contexts
      lock: noOpLock,
      // Faster detection of session state
      detectSessionInUrl: true,
    }
  });
}

// Lazy initialization to avoid crashes during module load
export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    supabaseInstance = createSafeClient();
  }
  return supabaseInstance;
}

// For compatibility with existing code that imports `supabase` directly
// This is a getter that lazily creates the client
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    const client = getSupabase();
    const value = client[prop as keyof SupabaseClient<Database>];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});
