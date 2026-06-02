import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { authorizeProfile } from './authorize';
import { getLocalAdminSession } from './local-admin-cookie';
import { resolveOnce } from './request-context';

type AdminRole = 'admin' | 'super_admin';
type AdminDatabaseClient =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createAdminClient>;

// Trusted, server-set request header carrying the middleware-verified user id.
// Middleware (`lib/supabase/middleware.ts`) strips any inbound copy before
// verification and re-sets it only after a successful server-side getUser(), so
// reading it here lets the page resolver skip a redundant auth.getUser() round-trip
// (Req 2.3, 7.4) without weakening security.
const TRUSTED_IDENTITY_HEADER = 'x-admin-user-id';

interface AdminProfileLookup {
  id: string;
  full_name: string;
  email: string;
  role: AdminRole;
}

/**
 * Richer shape fetched for local-admin precedence resolution. We need
 * `approval_status` and `created_at` in-memory to pick the precedence winner
 * (explicit id, then email, then earliest approved admin) without extra queries.
 */
export interface LocalAdminCandidate extends AdminProfileLookup {
  approval_status: string;
  created_at: string;
}

export interface AdminAccess {
  actorProfileId: string | null;
  database: AdminDatabaseClient;
  displayName: string;
  email: string;
  mode: 'local' | 'supabase';
  role: AdminRole;
}

interface AdminAccessOptions {
  /**
   * Page renders do not need the Supabase profile behind the local admin login.
   * Write APIs do, because audit fields need a real profile id.
   */
  resolveActorProfile?: boolean;
}

/**
 * Inputs that decide the local-admin precedence winner, independent of how the
 * candidate set was fetched.
 */
export interface LocalAdminSelectionInput {
  /** The configured `ADMIN_PROFILE_ID`, if any. Trimmed/empty values are ignored. */
  explicitId?: string | null;
  /** The email from the verified local-admin session. */
  email: string;
}

/**
 * Pure precedence selector for the local-admin profile (Req 1.3).
 *
 * Given the single bounded candidate set fetched by {@link resolveLocalAdminProfile}
 * (already restricted to admin/super_admin roles by the query), pick the winner using
 * the documented precedence rules — with NO additional I/O:
 *
 *   1. The candidate whose id equals `explicitId` wins outright, regardless of its
 *      approval status (mirrors the prior explicit-id branch).
 *   2. Otherwise the earliest-created APPROVED admin whose email matches wins.
 *   3. Otherwise the earliest-created APPROVED admin wins.
 *   4. Otherwise there is no winner (`null`).
 *
 * This is a pure function: no I/O, no side effects, deterministic for a given input.
 * Extracting it keeps {@link resolveLocalAdminProfile} a thin one-query wrapper and
 * makes the precedence rule unit- and property-testable in isolation (Property 4).
 */
export function pickLocalAdminProfile(
  candidates: LocalAdminCandidate[],
  { explicitId, email }: LocalAdminSelectionInput
): LocalAdminCandidate | null {
  const explicit = explicitId?.trim();

  // Precedence 1: explicit ADMIN_PROFILE_ID match wins outright (any approval status).
  if (explicit) {
    const explicitMatch = candidates.find((profile) => profile.id === explicit);
    if (explicitMatch) {
      return explicitMatch;
    }
  }

  // Precedence 2 & 3 only consider approved admins, ordered earliest-first.
  const approved = candidates
    .filter((profile) => profile.approval_status === 'approved')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const emailMatch = approved.find((profile) => profile.email === email);
  if (emailMatch) {
    return emailMatch;
  }

  return approved[0] ?? null;
}

/**
 * Resolve the local-admin profile in AT MOST ONE database query (Req 1.3).
 *
 * Previously this issued up to three sequential queries (explicit id, then email,
 * then earliest approved admin). We now fetch a single bounded candidate set in one
 * query and apply the precedence rules in memory via {@link pickLocalAdminProfile}:
 *
 *   1. The profile whose id equals `ADMIN_PROFILE_ID` (any approval status) wins.
 *   2. Otherwise the earliest-created approved admin whose email matches wins.
 *   3. Otherwise the earliest-created approved admin wins.
 *
 * The query filters to admin roles (AND) and ORs together the three ways a row can
 * be a precedence candidate: explicit id, email match, or approved. Because the
 * role filter restricts the set to admin/super_admin profiles (a small population),
 * a bounded fetch captures every possible winner; precedence is then decided in JS.
 *
 * Any backend error degrades to `null` so the local-admin session still works with
 * its 'Local Admin' / 'super_admin' fallbacks rather than denying access.
 */
async function resolveLocalAdminProfile(
  supabase: ReturnType<typeof createAdminClient>,
  email: string
): Promise<AdminProfileLookup | null> {
  const explicitProfileId = process.env.ADMIN_PROFILE_ID?.trim();

  try {
    // The set of rows that could be a precedence winner: the explicit id row (any
    // approval status), the email-matching row, or any approved admin.
    const orConditions = [`email.eq.${email}`, 'approval_status.eq.approved'];
    if (explicitProfileId) {
      orConditions.unshift(`id.eq.${explicitProfileId}`);
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, approval_status, created_at')
      .in('role', ['admin', 'super_admin'])
      .or(orConditions.join(','))
      .order('created_at', { ascending: true })
      .limit(50);

    const candidates = (data ?? []) as LocalAdminCandidate[];

    // Precedence decided purely in-memory over the single fetched candidate set.
    return pickLocalAdminProfile(candidates, { explicitId: explicitProfileId, email });
  } catch {
    // Fail soft: a profile-lookup error should not lock the local admin out; the
    // caller falls back to the 'Local Admin' / 'super_admin' defaults.
    return null;
  }
}

export function getAdminActorProfileErrorMessage() {
  return (
    'Admin write access needs an approved admin profile in Supabase. ' +
    'Set ADMIN_PROFILE_ID or promote an alumni profile to admin first.'
  );
}

async function readAdminAccess(resolveActorProfile: boolean): Promise<AdminAccess | null> {
  const localSession = await getLocalAdminSession();

  if (localSession) {
    const supabase = createAdminClient();
    const profile = resolveActorProfile
      ? await resolveLocalAdminProfile(supabase, localSession.email)
      : null;

    return {
      actorProfileId: profile?.id ?? null,
      database: supabase,
      displayName: profile?.full_name ?? 'Local Admin',
      email: localSession.email,
      mode: 'local',
      role: profile?.role ?? 'super_admin',
    };
  }

  // Supabase path. Wrap every backend call so any error fails closed (Req 1.5, 8.5):
  // returning null routes through `requireAdminAccess` -> redirect('/admin-login').
  try {
    const supabase = await createClient();

    // Req 2.3 / 7.4: reuse the middleware-verified identity when present so we skip
    // the redundant auth.getUser() network round-trip. Fall back to getUser() only
    // when the trusted header is absent.
    const headerStore = await headers();
    let verifiedUserId = headerStore.get(TRUSTED_IDENTITY_HEADER)?.trim() || null;

    if (!verifiedUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      verifiedUserId = user?.id ?? null;
    }

    if (!verifiedUserId) {
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, approval_status')
      .eq('id', verifiedUserId)
      .maybeSingle();

    // Route the grant/deny decision through the pure authorization seam (Req 1.6,
    // 8.4, 8.5) instead of inlining the role/approval checks.
    const { grant } = authorizeProfile(profile);
    if (!grant || !profile) {
      return null;
    }

    return {
      actorProfileId: profile.id,
      database: supabase,
      displayName: profile.full_name,
      email: profile.email,
      mode: 'supabase',
      role: profile.role as AdminRole,
    };
  } catch {
    return null;
  }
}

export async function getAdminAccess(
  options: AdminAccessOptions = {}
): Promise<AdminAccess | null> {
  return resolveOnce(Boolean(options.resolveActorProfile), readAdminAccess);
}

export async function requireAdminAccess(options: AdminAccessOptions = {}) {
  const access = await resolveOnce(Boolean(options.resolveActorProfile), readAdminAccess);

  if (!access) {
    redirect('/admin-login');
  }

  return access;
}
