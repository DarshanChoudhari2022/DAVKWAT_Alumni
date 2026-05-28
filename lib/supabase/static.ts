import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Anon-key Supabase client that does NOT use cookies.
 * Safe to call inside unstable_cache / ISR / revalidate pages.
 * Respects RLS with the anon role (public-read policies).
 *
 * Returns null if env vars are missing (e.g. during CI build).
 */
export function createStaticClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('[supabase/static] Missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY — returning null');
    return null;
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

