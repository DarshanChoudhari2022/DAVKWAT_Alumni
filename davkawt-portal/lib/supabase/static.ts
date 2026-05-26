import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Anon-key Supabase client that does NOT use cookies.
 * Safe to call inside unstable_cache / ISR / revalidate pages.
 * Respects RLS with the anon role (public-read policies).
 */
export function createStaticClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
