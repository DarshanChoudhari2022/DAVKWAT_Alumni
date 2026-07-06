'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Singleton browser-side Supabase client.
 * Avoids re-creating the client (and its internal session listener) on every call.
 */
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
