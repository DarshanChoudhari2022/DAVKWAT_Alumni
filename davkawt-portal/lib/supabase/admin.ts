import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Service-role Supabase client. SERVER-ONLY.
 * Bypasses RLS — use only inside trusted server code (webhooks, admin actions
 * that have already verified the caller's role).
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
