import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Service-role Supabase client. SERVER-ONLY.
 * Bypasses RLS — use only inside trusted server code (webhooks, admin actions
 * that have already verified the caller's role).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key === 'PASTE_SERVICE_ROLE_KEY_HERE') {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'Go to your Supabase dashboard → Settings → API → service_role key, ' +
      'then paste it into .env.local (local) or Vercel Environment Variables (production).'
    );
  }
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
