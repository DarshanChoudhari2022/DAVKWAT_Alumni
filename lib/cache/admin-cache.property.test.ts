// Feature: admin-portal-performance, Property 16: Cache keys are identity-independent (no cross-admin leakage)
//
// **Validates: Requirements 8.3**
//
// Property 16 (design Section, "Cache keys are identity-independent"):
//
//   For ANY two distinct administrator identities (and EITHER auth `mode`, `local` or
//   `supabase`) and ANY cached descriptor, the generated cache key is identical and
//   contains no administrator identity or auth-mode component; therefore no
//   identity-scoped value of one administrator can be served to another.
//
// The structural insight under test: `buildCacheKey(descriptor)` takes ONLY a
// descriptor (its `keyParts`). It has NO administrator-identity parameter and NO
// auth-mode parameter by design, so its output is constant with respect to identity
// and mode. The tests below prove this two ways:
//
//   1. Determinism / identity-independence as a function: building the key "in the
//      context of" administrator A is byte-identical to building it in the context of a
//      distinct administrator B under either auth mode — because the function cannot
//      observe either input.
//   2. No leakage: the produced key (and every descriptor's static key parts) contains
//      none of the generated identity strings and neither the `local` nor `supabase`
//      mode token, even when explicitly identity-looking values are fed in.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  buildCacheKey,
  CACHE_DESCRIPTORS,
  type CachedValueDescriptor,
} from '@/lib/cache/admin-cache';

const NUM_RUNS = 200; // comfortably exceeds the required >= 100 iterations

/** The two auth modes; neither must ever appear in a cache key. */
const MODE_TOKENS = ['local', 'supabase'] as const;

/** Every canonical descriptor as a flat list for sampling. */
const ALL_DESCRIPTORS = Object.values(CACHE_DESCRIPTORS) as CachedValueDescriptor[];

/**
 * Identity-looking value generator. Every branch produces a string that an
 * administrator identity could realistically take (a UUID, an email, or a prefixed
 * opaque token) and that, by construction, can never equal one of the portal-global
 * descriptor key tokens (`admin`, `reference`, `stat`, `payments`, ...). This lets us
 * assert the key never contains the identity without spurious collisions.
 */
const identityArb = fc.oneof(
  fc.uuid(),
  fc.emailAddress(),
  fc.string({ minLength: 1, maxLength: 40 }).map((s) => `actor-${s}`)
);

/** Two DISTINCT administrator identities. */
const distinctIdentitiesArb = fc
  .tuple(identityArb, identityArb)
  .filter(([a, b]) => a !== b);

const modeArb = fc.constantFrom(...MODE_TOKENS);

/** Pick an arbitrary canonical descriptor. */
const descriptorArb = fc.constantFrom(...ALL_DESCRIPTORS);

/**
 * Arbitrary identity-independent `keyParts` arrays built from safe, word-like tokens
 * (lowercase letters/`-` only) so they never coincide with a UUID, email, or the mode
 * tokens. Optional surrounding whitespace exercises the builder's trim normalization.
 */
const safeTokenArb = fc
  .stringMatching(/^[a-z][a-z-]{0,20}$/)
  .filter((t) => !(MODE_TOKENS as readonly string[]).includes(t));

const arbitraryDescriptorArb: fc.Arbitrary<CachedValueDescriptor> = fc
  .array(
    fc.tuple(safeTokenArb, fc.constantFrom('', ' ', '  ')).map(([t, pad]) => `${pad}${t}${pad}`),
    { minLength: 1, maxLength: 6 }
  )
  .map((keyParts) => ({
    keyParts,
    tags: [],
    revalidateSeconds: 60,
    class: 'reference' as const,
  }));

/** Patterns that would indicate an actor-id-like token leaked into a key part. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /@/;

/**
 * Assert that none of the parts of a built key carries an administrator identity or an
 * auth-mode component.
 */
function assertNoIdentityOrModeLeak(key: string[], identities: string[]): void {
  for (const part of key) {
    // No part may equal or embed one of the live identities.
    for (const id of identities) {
      expect(part.includes(id)).toBe(false);
    }
    // No part may equal or embed an auth-mode token.
    for (const mode of MODE_TOKENS) {
      expect(part.includes(mode)).toBe(false);
    }
    // No part may itself look like an actor id (UUID or email).
    expect(UUID_RE.test(part)).toBe(false);
    expect(EMAIL_RE.test(part)).toBe(false);
  }
}

describe('Property 16: Cache keys are identity-independent (no cross-admin leakage)', () => {
  it('produces the identical key for two distinct admins under either auth mode (canonical descriptors)', () => {
    fc.assert(
      fc.property(
        descriptorArb,
        distinctIdentitiesArb,
        modeArb,
        modeArb,
        (descriptor, [adminA, adminB], modeA, modeB) => {
          // `buildCacheKey` takes only the descriptor — there is no identity/mode
          // parameter — so building the key in admin A's context (mode A) must be
          // byte-identical to building it in admin B's context (mode B). We bind the
          // identities/modes here purely to model "two different administrators"; the
          // function is structurally incapable of observing them.
          void adminA;
          void adminB;
          void modeA;
          void modeB;

          const keyForA = buildCacheKey(descriptor);
          const keyForB = buildCacheKey(descriptor);

          expect(keyForB).toEqual(keyForA);
          // And the key carries no identity/mode component.
          assertNoIdentityOrModeLeak(keyForA, [adminA, adminB]);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('produces the identical, leak-free key for arbitrary identity-independent descriptors', () => {
    fc.assert(
      fc.property(
        arbitraryDescriptorArb,
        distinctIdentitiesArb,
        modeArb,
        modeArb,
        (descriptor, [adminA, adminB], modeA, modeB) => {
          void adminA;
          void adminB;
          void modeA;
          void modeB;

          const keyForA = buildCacheKey(descriptor);
          const keyForB = buildCacheKey(descriptor);

          // Deterministic and identity/mode-independent.
          expect(keyForB).toEqual(keyForA);
          // Output is exactly the trimmed key parts (no extra identity/mode component
          // is ever folded in).
          expect(keyForA).toEqual(descriptor.keyParts.map((p) => p.trim()));

          assertNoIdentityOrModeLeak(keyForA, [adminA, adminB]);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('never lets explicitly identity-looking values appear in any canonical key', () => {
    // Fixed, deliberately identity-looking values (a UUID, an email, the mode tokens,
    // a role) that must never surface in a portal-global cache key.
    const plantedIdentities = [
      '11111111-2222-3333-4444-555555555555',
      'admin.person@example.com',
      'local',
      'supabase',
      'super_admin',
    ];

    fc.assert(
      fc.property(descriptorArb, (descriptor) => {
        const key = buildCacheKey(descriptor);
        for (const part of key) {
          for (const planted of plantedIdentities) {
            expect(part.includes(planted)).toBe(false);
          }
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('contains no actor-id-like or mode token in any canonical descriptor key part', () => {
    // A direct structural audit of the descriptor table: every key part is a
    // portal-global token, never an actor id (UUID/email) and never a mode token.
    for (const descriptor of ALL_DESCRIPTORS) {
      const key = buildCacheKey(descriptor);
      for (const part of key) {
        expect(UUID_RE.test(part)).toBe(false);
        expect(EMAIL_RE.test(part)).toBe(false);
        expect((MODE_TOKENS as readonly string[]).includes(part)).toBe(false);
      }
    }
  });
});
