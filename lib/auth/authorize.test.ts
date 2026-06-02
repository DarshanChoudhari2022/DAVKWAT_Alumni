import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  authorizeProfile,
  ADMIN_ROLES,
  APPROVED_STATUS,
  type AuthorizableProfile,
} from '@/lib/auth/authorize';

// Feature: admin-portal-performance, Property 2: Authorization is a total decision
//
// For ANY resolved session input — a profile with arbitrary role/approval_status,
// a profile missing fields, null, undefined, or a non-object — authorizeProfile
// returns a definite { grant: boolean } that is true IF AND ONLY IF
// approval_status === 'approved' AND role ∈ {'admin','super_admin'}, and false in
// every other case (including indeterminate/missing inputs).
//
// Validates: Requirements 1.6, 8.4, 8.5

/**
 * Independent recomputation of the expected decision used to assert the iff
 * relationship. This deliberately re-derives the rule from the requirement text
 * ("approved" + admin role) rather than reusing the implementation, so a defect
 * in `authorizeProfile` would surface as a mismatch.
 */
function expectedGrant(input: unknown): boolean {
  if (input === null || typeof input !== 'object') {
    return false;
  }
  const profile = input as { role?: unknown; approval_status?: unknown };
  const roleIsAdmin =
    typeof profile.role === 'string' &&
    (ADMIN_ROLES as readonly string[]).includes(profile.role);
  const statusIsApproved = profile.approval_status === APPROVED_STATUS;
  return roleIsAdmin && statusIsApproved;
}

// Field generators that span the valid values, plausible-but-wrong strings,
// arbitrary strings, and the indeterminate cases (null / undefined). These
// ensure both the grant and the deny branches are exercised.
const roleArb = fc.oneof(
  fc.constantFrom<string>(...ADMIN_ROLES), // valid: 'admin' | 'super_admin'
  fc.constantFrom('user', 'moderator', 'ADMIN', 'Admin', 'Super_Admin', 'super_admin ', '', 'guest'),
  fc.string(),
  fc.constant(null),
  fc.constant(undefined)
);

const statusArb = fc.oneof(
  fc.constant(APPROVED_STATUS), // valid: 'approved'
  fc.constantFrom('pending', 'rejected', 'APPROVED', 'Approved', 'approved ', '', 'declined'),
  fc.string(),
  fc.constant(null),
  fc.constant(undefined)
);

// A profile-like object where each key may be present (with any of the values
// above) or entirely absent (requiredKeys: []), covering "missing fields".
const profileArb = fc.record(
  { role: roleArb, approval_status: statusArb },
  { requiredKeys: [] }
);

// Non-object / non-profile inputs: null, undefined, and assorted primitives.
const nonProfileArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.integer(),
  fc.double(),
  fc.boolean(),
  fc.string(),
  fc.constant(NaN)
);

const inputArb = fc.oneof(profileArb, nonProfileArb);

describe('authorizeProfile — Property 2: Authorization is a total decision', () => {
  it('always returns a definite { grant: boolean } that holds the approved+admin iff', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const decision = authorizeProfile(input as AuthorizableProfile | null | undefined);

        // Totality: every input maps to a definite boolean decision.
        expect(decision).toBeTypeOf('object');
        expect(typeof decision.grant).toBe('boolean');

        // The iff: grant <=> approved + admin role, computed independently.
        expect(decision.grant).toBe(expectedGrant(input));
      }),
      { numRuns: 300 }
    );
  });

  it('grants for every approved + admin-role combination (deny-branch never wins here)', () => {
    fc.assert(
      fc.property(fc.constantFrom<string>(...ADMIN_ROLES), (role) => {
        const decision = authorizeProfile({ role, approval_status: APPROVED_STATUS });
        expect(decision.grant).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('denies whenever the status is not exactly "approved", for any role', () => {
    const nonApprovedStatusArb = fc
      .oneof(fc.string(), fc.constantFrom('pending', 'rejected', 'APPROVED', ''), fc.constant(null), fc.constant(undefined))
      .filter((s) => s !== APPROVED_STATUS);

    fc.assert(
      fc.property(roleArb, nonApprovedStatusArb, (role, approval_status) => {
        const decision = authorizeProfile({
          role: role as string | null | undefined,
          approval_status: approval_status as string | null | undefined,
        });
        expect(decision.grant).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('denies whenever the role is not an admin role, even when approved', () => {
    const nonAdminRoleArb = fc
      .oneof(fc.string(), fc.constantFrom('user', 'moderator', 'ADMIN', ''), fc.constant(null), fc.constant(undefined))
      .filter((r) => !(ADMIN_ROLES as readonly string[]).includes(r as string));

    fc.assert(
      fc.property(nonAdminRoleArb, (role) => {
        const decision = authorizeProfile({
          role: role as string | null | undefined,
          approval_status: APPROVED_STATUS,
        });
        expect(decision.grant).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

describe('authorizeProfile — representative unit examples', () => {
  it('grants for approved admin', () => {
    expect(authorizeProfile({ role: 'admin', approval_status: 'approved' }).grant).toBe(true);
  });

  it('grants for approved super_admin', () => {
    expect(authorizeProfile({ role: 'super_admin', approval_status: 'approved' }).grant).toBe(true);
  });

  it('denies a pending admin', () => {
    expect(authorizeProfile({ role: 'admin', approval_status: 'pending' }).grant).toBe(false);
  });

  it('denies an approved non-admin', () => {
    expect(authorizeProfile({ role: 'user', approval_status: 'approved' }).grant).toBe(false);
  });

  it('denies on case-mismatched role/status', () => {
    expect(authorizeProfile({ role: 'Admin', approval_status: 'approved' }).grant).toBe(false);
    expect(authorizeProfile({ role: 'admin', approval_status: 'Approved' }).grant).toBe(false);
  });

  it('denies for null, undefined, and missing fields', () => {
    expect(authorizeProfile(null).grant).toBe(false);
    expect(authorizeProfile(undefined).grant).toBe(false);
    expect(authorizeProfile({}).grant).toBe(false);
    expect(authorizeProfile({ role: 'admin' }).grant).toBe(false);
    expect(authorizeProfile({ approval_status: 'approved' }).grant).toBe(false);
  });

  it('denies for non-object inputs', () => {
    expect(authorizeProfile(42 as unknown as AuthorizableProfile).grant).toBe(false);
    expect(authorizeProfile('approved' as unknown as AuthorizableProfile).grant).toBe(false);
    expect(authorizeProfile(true as unknown as AuthorizableProfile).grant).toBe(false);
  });
});
