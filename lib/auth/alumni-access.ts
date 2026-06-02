import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { resolveOnce, type RequestScopedLoader } from '@/lib/auth/request-context';
import { createClient } from '@/lib/supabase/server';

// Trusted, server-set request header carrying the middleware-verified user id.
// Middleware (`lib/supabase/middleware.ts`) strips any inbound copy before
// verification and re-sets it only after a successful server-side getUser(), so
// reading it here lets the page resolver skip a redundant auth.getUser() round-trip
// (Req 1.3, 7.2) without weakening security.
const TRUSTED_IDENTITY_HEADER = 'x-admin-user-id';

export interface AlumniProfile {
  id: string;
  full_name: string;
  email: string;
  batch_year: number;
  course: string;
  is_paid_member: boolean;
  membership_expires_at: string | null;
  avatar_url: string | null;
  approval_status: string;
}

export interface AlumniAccess {
  userId: string;
  profile: AlumniProfile;
  database: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Pure authorization decision for the alumni portal.
 *
 * Grants access if and only if the profile exists and its `approval_status` is
 * exactly `'approved'`. Every other input — `null`, `undefined`, or a profile
 * with any other status — denies access (fail closed).
 *
 * This is a pure function: no I/O, no side effects, deterministic for a given input.
 * Extracted as a testable seam (Property 4: Authorization is a total decision).
 *
 * Requirements: 1.7, 7.2
 */
export function authorizeAlumniProfile(
  profile: { approval_status?: string | null } | null | undefined
): { grant: boolean } {
  if (profile == null || typeof profile !== 'object') {
    return { grant: false };
  }
  return { grant: profile.approval_status === 'approved' };
}

/**
 * The underlying loader — NOT called directly by pages.
 * Reads the trusted x-admin-user-id header (set by middleware) to skip auth.getUser().
 * Constructs an RLS-scoped client from the session cookie for data reads.
 * Fail-closed: returns null on any error (Req 1.6).
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 7.2, 7.3
 */
const readAlumniAccess: RequestScopedLoader<AlumniAccess | null> = async () => {
  try {
    const headerStore = await headers();
    const userId = headerStore.get(TRUSTED_IDENTITY_HEADER)?.trim() || null;

    if (!userId) return null;

    // RLS-scoped client constructed from the user's session cookie.
    // All data reads execute under their RLS policies (Req 7.3).
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, batch_year, course, is_paid_member, membership_expires_at, avatar_url, approval_status'
      )
      .eq('id', userId)
      .single();

    // Route the grant/deny decision through the pure authorization seam (Req 1.7, 7.2).
    const { grant } = authorizeAlumniProfile(profile);
    if (!grant || !profile) return null;

    return { userId, profile: profile as AlumniProfile, database: supabase };
  } catch {
    // Fail closed: any error denies access (Req 1.6).
    return null;
  }
};

/**
 * Request-scoped memoized alumni access. The first caller resolves; concurrent
 * and subsequent callers within the same request receive the same promise.
 * Reuses resolveOnce from lib/auth/request-context.ts (Req 10.1).
 *
 * The `false` argument means this uses a separate memo slot from admin access
 * (which uses `true`/`false` for resolveActorProfile variants). Alumni access
 * has no actor-profile variant, so we always pass `false`.
 *
 * Requirements: 1.1, 1.2, 1.4
 */
export function getAlumniAccess(): Promise<AlumniAccess | null> {
  return resolveOnce(false, readAlumniAccess);
}

/**
 * Require alumni access or redirect to /login. Every alumni page calls this.
 * Fail-closed: null/error always redirects (Req 1.5, 1.6, 1.7).
 *
 * Requirements: 1.5, 1.6, 1.7, 7.2
 */
export async function requireAlumniAccess(): Promise<AlumniAccess> {
  const access = await getAlumniAccess();
  if (!access) {
    redirect('/login');
  }
  return access;
}
