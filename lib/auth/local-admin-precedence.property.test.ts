// Feature: admin-portal-performance, Property 4: Local-admin profile resolves in one query
//
// **Validates: Requirements 1.3**
//
// Property 4 (design Section 1, "Local-admin profile resolves in one query"):
//
//   For ANY combination of inputs (explicit `ADMIN_PROFILE_ID` present or absent, email
//   match present or absent, an approved admin existing or not), the local-admin profile
//   resolver issues at most one profile query per Request_Context and returns the correct
//   precedence winner (explicit id, then email match, then earliest approved admin).
//
// ---------------------------------------------------------------------------------
// Approach: option (b) — pure-helper extraction.
// ---------------------------------------------------------------------------------
// `resolveLocalAdminProfile` performs exactly ONE Supabase query (a single
// `from('profiles').select(...).in(...).or(...).order(...).limit(...)` round-trip) and
// then decides the precedence winner in memory. We extracted that in-memory decision into
// the pure, exported `pickLocalAdminProfile(candidates, { explicitId, email })` helper and
// had `resolveLocalAdminProfile` call it (a behavior-preserving refactor). This test
// property-tests the pure helper directly:
//
//   * The <=1-query guarantee is established BY CONSTRUCTION: the helper takes an
//     already-fetched candidate array and performs NO I/O, so the resolver's single query
//     is the only round-trip. We additionally assert the helper touches no data source by
//     verifying it is a pure function over its inputs (same inputs -> same winner, and
//     equal to a reference precedence oracle).
//   * The precedence winner is verified against an independent oracle across generated
//     candidate sets and inputs.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  pickLocalAdminProfile,
  type LocalAdminCandidate,
} from '@/lib/auth/admin-access';

const NUM_RUNS = 300; // comfortably exceeds the required >= 100 iterations

const ROLES = ['admin', 'super_admin'] as const;
const APPROVAL_STATES = ['approved', 'pending', 'rejected'] as const;

/**
 * Independent reference oracle for the documented precedence rule. Deliberately written
 * differently from the implementation (explicit sort by created_at then linear scans) so
 * a copy of the same bug is unlikely.
 *
 *   1. explicit id match wins outright (any approval status)
 *   2. else earliest-created approved admin whose email matches
 *   3. else earliest-created approved admin
 *   4. else null
 */
function oracle(
  candidates: LocalAdminCandidate[],
  explicitId: string | null | undefined,
  email: string
): LocalAdminCandidate | null {
  const explicit = explicitId?.trim();
  if (explicit) {
    const hit = candidates.find((c) => c.id === explicit);
    if (hit) return hit;
  }
  const approvedSorted = candidates
    .filter((c) => c.approval_status === 'approved')
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const byEmail = approvedSorted.find((c) => c.email === email);
  if (byEmail) return byEmail;

  return approvedSorted[0] ?? null;
}

// A small id space so explicit-id and email matches actually occur with reasonable
// frequency across runs (rather than being astronomically unlikely).
const idArb = fc.constantFrom('id-a', 'id-b', 'id-c', 'id-d', 'id-e', 'id-f');
const emailArb = fc.constantFrom(
  'admin1@example.com',
  'admin2@example.com',
  'admin3@example.com',
  'other@example.com'
);
// created_at as ISO-ish sortable strings; collisions are intentional to exercise ties.
const createdAtArb = fc.constantFrom(
  '2023-01-01T00:00:00.000Z',
  '2023-06-15T12:30:00.000Z',
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z', // duplicate -> tie on created_at
  '2025-03-20T08:00:00.000Z'
);

const candidateArb: fc.Arbitrary<LocalAdminCandidate> = fc.record({
  id: idArb,
  full_name: fc.string({ minLength: 1, maxLength: 12 }),
  email: emailArb,
  role: fc.constantFrom(...ROLES),
  approval_status: fc.constantFrom(...APPROVAL_STATES),
  created_at: createdAtArb,
});

const scenarioArb = fc.record({
  // Candidate set as the single query would return it (already role-filtered upstream;
  // we still generate only admin roles here to match the query's `.in('role', ...)`).
  candidates: fc.array(candidateArb, { minLength: 0, maxLength: 12 }),
  // Explicit ADMIN_PROFILE_ID present or absent (and sometimes whitespace-only -> absent).
  explicitId: fc.oneof(
    fc.constant(null),
    fc.constant(undefined),
    fc.constant('   '),
    idArb,
    fc.constant('id-nonexistent')
  ),
  email: emailArb,
});

describe('Property 4: Local-admin profile resolves in one query', () => {
  it('selects the correct precedence winner across all input combinations (pure, no I/O)', () => {
    fc.assert(
      fc.property(scenarioArb, ({ candidates, explicitId, email }) => {
        const winner = pickLocalAdminProfile(candidates, { explicitId, email });
        const expected = oracle(candidates, explicitId, email);

        // Same winner as the independent oracle (identity-equal: it must be a member of
        // the input set, not a fabricated row).
        expect(winner).toBe(expected);

        // Structural precedence guarantees:
        const explicit = explicitId?.trim();
        if (explicit && candidates.some((c) => c.id === explicit)) {
          // Precedence 1: explicit id wins outright regardless of approval status.
          expect(winner).not.toBeNull();
          expect(winner!.id).toBe(explicit);
        } else {
          const approved = candidates.filter((c) => c.approval_status === 'approved');
          if (approved.length === 0) {
            // No explicit match and no approved admin -> no winner.
            expect(winner).toBeNull();
          } else {
            // A winner exists and must be an approved admin.
            expect(winner).not.toBeNull();
            expect(winner!.approval_status).toBe('approved');

            const earliestApproved = approved
              .slice()
              .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
            const emailMatchExists = approved.some((c) => c.email === email);

            if (emailMatchExists) {
              // Precedence 2: earliest approved email match.
              expect(winner!.email).toBe(email);
              const earliestEmailMatch = approved
                .filter((c) => c.email === email)
                .sort((a, b) => a.created_at.localeCompare(b.created_at))[0]!;
              expect(winner!.created_at).toBe(earliestEmailMatch.created_at);
            } else {
              // Precedence 3: earliest approved admin overall.
              expect(winner!.created_at).toBe(earliestApproved!.created_at);
            }
          }
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('is a pure function: identical inputs always yield the identical winner (single query suffices)', () => {
    // Purity is what guarantees the resolver needs no extra queries to decide the winner:
    // the single fetched candidate set fully determines the result. We assert determinism
    // and that the returned winner is always drawn from the input set (never fabricated,
    // never requiring a follow-up lookup).
    fc.assert(
      fc.property(scenarioArb, ({ candidates, explicitId, email }) => {
        const a = pickLocalAdminProfile(candidates, { explicitId, email });
        const b = pickLocalAdminProfile(candidates, { explicitId, email });
        expect(a).toBe(b);
        if (a !== null) {
          expect(candidates).toContain(a);
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
