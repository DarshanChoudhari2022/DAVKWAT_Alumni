// Feature: admin-portal-performance, Property 3: Auth errors fail closed
//
// **Validates: Requirements 1.5, 2.5**
//
// Property 3 (design Section, "Auth errors fail closed"):
//
//   For ANY error injected at any step of authentication resolution (in the page
//   resolver or in middleware), the system denies access and redirects to the login
//   route, and never returns an authenticated result or renders administrative data.
//
// ---------------------------------------------------------------------------------
// Test boundary
// ---------------------------------------------------------------------------------
// The real page resolver `readAdminAccess` (admin-access.ts) is module-private and calls
// `next/headers` `headers()`, `next/navigation` `redirect()`, and constructs Supabase
// clients — all of which require a Next.js request scope and real I/O that cannot run in a
// Vitest unit context. Per the task, we focus the property on the seam we CAN exercise: the
// fail-closed DECISION logic. We reconstruct the resolver's Supabase-path control flow
// faithfully (the same ordered steps wrapped in a single try/catch, with the grant/deny
// decision routed through the REAL `authorizeProfile`), then inject an error (or a null /
// unauthorized result) at each step and assert the wrapper ALWAYS denies (returns `null`),
// never an authenticated `AdminAccess`. Because `requireAdminAccess` redirects exactly when
// the resolver returns `null` (`if (!access) redirect('/admin-login')`), a `null` here is
// equivalent to "deny + redirect, no administrative data".
//
// `safeResolveModel` below mirrors `readAdminAccess`'s supabase branch step-for-step:
//   1. read verified identity (header reuse, else getUser)  -- may throw or yield null
//   2. profile lookup                                        -- may throw or yield null
//   3. authorizeProfile(profile) decision (REAL seam)
// All wrapped in try/catch that returns `null` on any throw (Req 1.5, 2.5).

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { authorizeProfile, type AuthorizableProfile } from '@/lib/auth/authorize';

const NUM_RUNS = 300; // comfortably exceeds the required >= 100 iterations

/** The steps at which a failure can be injected. */
type FailStep = 'identity' | 'profile' | 'none';

/** What a step yields when it does not throw. */
type StepOutcome<T> =
  | { kind: 'throw' }
  | { kind: 'value'; value: T };

interface AdminAccessResult {
  actorProfileId: string;
  displayName: string;
  email: string;
  role: string;
}

/**
 * Faithful reconstruction of the fail-closed control flow of `readAdminAccess`'s
 * supabase path. Returns an authenticated result only when EVERY step succeeds and the
 * profile is authorized; returns `null` (deny) on any thrown error, missing identity,
 * missing profile, or denied authorization.
 */
function safeResolveModel(opts: {
  identity: StepOutcome<string | null>;
  profile: StepOutcome<AuthorizableProfile | null>;
}): AdminAccessResult | null {
  try {
    // Step 1: verified identity (header reuse OR getUser). A throw simulates a backend
    // /network error during identity verification (Req 1.5, 2.5).
    if (opts.identity.kind === 'throw') {
      throw new Error('identity step failed');
    }
    const verifiedUserId = opts.identity.value;
    if (!verifiedUserId) {
      return null; // no identity -> deny
    }

    // Step 2: profile lookup. A throw simulates a backend error during the DB read.
    if (opts.profile.kind === 'throw') {
      throw new Error('profile lookup failed');
    }
    const profile = opts.profile.value;

    // Step 3: route the grant/deny decision through the REAL authorization seam.
    const { grant } = authorizeProfile(profile);
    if (!grant || !profile) {
      return null; // unauthorized / missing profile -> deny
    }

    return {
      actorProfileId: (profile as { id?: string }).id ?? verifiedUserId,
      displayName: (profile as { full_name?: string }).full_name ?? '',
      email: (profile as { email?: string }).email ?? '',
      role: String(profile.role),
    };
  } catch {
    // Fail closed: any error at any step denies access (Req 1.5, 2.5).
    return null;
  }
}

/** A profile-like object generator, including authorized and unauthorized shapes. */
const profileValueArb: fc.Arbitrary<AuthorizableProfile | null> = fc.oneof(
  fc.constant(null),
  fc.record({
    role: fc.constantFrom('admin', 'super_admin', 'alumni', 'user', '', 'ADMIN'),
    approval_status: fc.constantFrom('approved', 'pending', 'rejected', '', 'Approved'),
    id: fc.uuid(),
    full_name: fc.string(),
    email: fc.emailAddress(),
  }) as unknown as fc.Arbitrary<AuthorizableProfile>
);

const identityValueArb: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  fc.uuid()
);

function outcomeArb<T>(valueArb: fc.Arbitrary<T>): fc.Arbitrary<StepOutcome<T>> {
  return fc.oneof(
    fc.constant<StepOutcome<T>>({ kind: 'throw' }),
    valueArb.map((value) => ({ kind: 'value', value }) as StepOutcome<T>)
  );
}

describe('Property 3: Auth errors fail closed (resolver side)', () => {
  it('denies (returns null) whenever any resolution step throws', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<FailStep>('identity', 'profile'),
        outcomeArb(identityValueArb),
        outcomeArb(profileValueArb),
        (failStep, identity, profile) => {
          // Force a throw at the chosen step regardless of the generated outcome.
          const injected = {
            identity:
              failStep === 'identity' ? ({ kind: 'throw' } as StepOutcome<string | null>) : identity,
            profile:
              failStep === 'profile' ? ({ kind: 'throw' } as StepOutcome<AuthorizableProfile | null>) : profile,
          };

          // If we forced the throw at the profile step but identity itself throws/has no
          // value, the profile step is never reached; in that case identity-failure still
          // yields deny. Either way the result must be a denial.
          const result = safeResolveModel(injected);
          expect(result).toBeNull();
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('never returns an authenticated result for an unauthorized or missing profile', () => {
    fc.assert(
      fc.property(identityValueArb, profileValueArb, (identityValue, profileValue) => {
        const result = safeResolveModel({
          identity: { kind: 'value', value: identityValue },
          profile: { kind: 'value', value: profileValue },
        });

        const { grant } = authorizeProfile(profileValue);

        if (!identityValue || !grant) {
          // No identity, or not authorized -> must deny.
          expect(result).toBeNull();
        } else {
          // Authorized: a result may be returned, but it must be a definite authenticated
          // object (never a partial/indeterminate state) carrying the granted role.
          expect(result).not.toBeNull();
          expect(['admin', 'super_admin']).toContain(result!.role);
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('grants only on the exact approved + admin/super_admin combination, denies everything else (total decision under errors)', () => {
    // Cross-check: across the full input space (including throwing steps), the resolver
    // returns a non-null authenticated result IF AND ONLY IF identity resolved, no step
    // threw, and authorizeProfile granted. This pins down "never returns an authenticated
    // result" on any error/indeterminate path.
    fc.assert(
      fc.property(
        outcomeArb(identityValueArb),
        outcomeArb(profileValueArb),
        (identity, profile) => {
          const result = safeResolveModel({ identity, profile });

          const noThrow = identity.kind === 'value' && profile.kind === 'value';
          const hasIdentity = identity.kind === 'value' && identity.value !== null;
          const granted =
            profile.kind === 'value' ? authorizeProfile(profile.value).grant : false;

          const shouldGrant = noThrow && hasIdentity && granted;
          expect(result !== null).toBe(shouldGrant);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});
