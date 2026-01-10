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

function createSafeClient(): SupabaseClient<Database> {
  const { storage } = getSafeStorage();
  
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
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
