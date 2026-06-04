import { headers } from 'next/headers';

export const TRUSTED_IDENTITY_HEADER = 'x-admin-user-id';

/**
 * Return the user id verified and forwarded by middleware for protected pages.
 * Middleware strips inbound copies before setting this header, so page renders
 * can avoid a second Supabase Auth network call.
 */
export async function getTrustedUserId(): Promise<string | null> {
  const headerStore = await headers();
  return headerStore.get(TRUSTED_IDENTITY_HEADER)?.trim() || null;
}
