/**
 * Pure authorization decision seam for the admin portal.
 *
 * This module isolates the grant/deny decision as a total, side-effect-free
 * function so it can be unit- and property-tested in isolation (see Property 2:
 * "Authorization is a total decision"). Callers in `lib/auth/admin-access.ts`
 * route their resolved profile through `authorizeProfile` rather than inlining
 * the role/approval checks.
 *
 * Semantics mirror the existing checks in `admin-access.ts`:
 *  - approval_status must be exactly `'approved'`
 *  - role must be `'admin'` or `'super_admin'`
 *
 * Any missing, malformed, or indeterminate input denies access. This makes the
 * decision total: every possible input maps to a definite `{ grant: boolean }`.
 *
 * Requirements: 1.6, 8.4, 8.5
 */

/** The roles that are permitted to access the admin portal. */
export const ADMIN_ROLES = ['admin', 'super_admin'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

/** The approval status that grants access. */
export const APPROVED_STATUS = 'approved';

/**
 * Minimal, permissive profile-like shape accepted by {@link authorizeProfile}.
 *
 * Fields are optional and typed as `unknown`-compatible so callers can pass a
 * partially-resolved or untrusted profile (e.g. a raw row) without first
 * narrowing it. The function is responsible for validating the shape.
 */
export interface AuthorizableProfile {
  role?: string | null;
  approval_status?: string | null;
}

/** Result of an authorization decision. Always definite. */
export interface AuthorizationDecision {
  grant: boolean;
}

function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === 'string' && (ADMIN_ROLES as readonly string[]).includes(role);
}

/**
 * Decide whether a resolved profile is allowed to access the admin portal.
 *
 * Grants access if and only if the profile's `approval_status` is exactly
 * `'approved'` and its `role` is `'admin'` or `'super_admin'`. Every other
 * input — `null`, `undefined`, a non-object, or a profile missing/with
 * indeterminate fields — denies access.
 *
 * This is a pure function: it performs no I/O and has no side effects.
 *
 * @param profile A profile-like object, or `null` when no profile resolved.
 * @returns `{ grant: true }` when access is allowed, otherwise `{ grant: false }`.
 */
export function authorizeProfile(
  profile: AuthorizableProfile | null | undefined
): AuthorizationDecision {
  if (profile === null || typeof profile !== 'object') {
    return { grant: false };
  }

  const grant = profile.approval_status === APPROVED_STATUS && isAdminRole(profile.role);

  return { grant };
}
