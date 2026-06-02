// Feature: admin-portal-performance, Property 10: Estimated-count failure falls back to exact
//
// **Validates: Requirements 5.6**
//
// Property 10 (design Section 5, "Estimated counts" / Correctness Property 10):
//
//   For ANY failure of the estimated-count path (RPC throwing, RPC returning an
//   `{ error }`, a `null` / non-numeric / negative / NaN estimate) `getListCount`
//   returns a usable EXACT count result (`isEstimated = false`) without throwing,
//   so pagination still renders. Conversely, when the planner returns a usable
//   (finite, >= 0) estimate, `getListCount` returns it as `{ count, isEstimated: true }`.
//
// This test drives `getListCount` with an INSTRUMENTED FAKE Supabase client — no
// real DB or network. The fake `rpc` is generated to cover every branch: throwing
// synchronously, returning a rejected promise, returning `{ error }`, returning
// `{ data: null }`, returning a non-numeric / negative / NaN / Infinity estimate,
// and returning a valid estimate (number or numeric string). A counting
// `exactFallback` thunk lets us assert the fallback is consulted exactly when —
// and only when — the estimate is unusable.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getListCount, type ListCountClient } from '@/lib/db/estimated-count';

const NUM_RUNS = 200; // comfortably exceeds the required >= 100 iterations

/**
 * Local mirror of the source's private `toUsableCount` so the test's expected
 * outcome is derived from the exact same coercion rule the implementation uses:
 * a finite, non-negative number or numeric string is floored; everything else is
 * unusable (`null`) and must trigger the exact fallback.
 */
function usableCount(value: unknown): number | null {
  let n: number;
  if (typeof value === 'number') {
    n = value;
  } else if (typeof value === 'string' && value.trim() !== '') {
    n = Number(value);
  } else {
    return null;
  }
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return Math.floor(n);
}

/** Discriminated description of how the fake RPC behaves on a given run. */
type RpcBehavior =
  | { kind: 'throw' } // rpc throws synchronously
  | { kind: 'reject' } // rpc returns a rejected promise
  | { kind: 'error'; error: unknown } // rpc resolves with a truthy { error }
  | { kind: 'data'; value: unknown }; // rpc resolves with { data: value, error: null }

// Values the planner RPC might return in the `data` slot. Spans usable numbers,
// usable numeric strings, plus every flavour of unusable value the source guards
// against (null, NaN, ±Infinity, negatives, non-numeric strings, booleans, objects).
const dataValueArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.double(), // floats incl. NaN, ±Infinity, negatives, zero
  fc.nat({ max: 100_000_000 }), // plain usable counts
  fc.nat({ max: 100_000_000 }).map((n) => String(n)), // usable numeric strings
  fc.integer({ min: -100_000, max: -1 }), // negative numbers -> unusable
  fc.integer({ min: -100_000, max: -1 }).map((n) => String(n)), // negative numeric strings
  fc.string(), // arbitrary strings (numeric and non-numeric)
  fc.constantFrom(
    null,
    undefined,
    true,
    false,
    NaN,
    Infinity,
    -Infinity,
    '',
    '   ',
    'NaN',
    'not-a-number',
    {},
    [],
  ),
);

const behaviorArb: fc.Arbitrary<RpcBehavior> = fc.oneof(
  fc.constant<RpcBehavior>({ kind: 'throw' }),
  fc.constant<RpcBehavior>({ kind: 'reject' }),
  // Truthy errors only, so the source's `if (!error)` guard genuinely takes the
  // failure branch (an empty/null "error" would be treated as success).
  fc
    .oneof(
      fc.constant(new Error('rpc backend error')),
      fc.record({ message: fc.string(), code: fc.string() }),
      fc.constant('estimate unavailable'),
    )
    .map<RpcBehavior>((error) => ({ kind: 'error', error })),
  dataValueArb.map<RpcBehavior>((value) => ({ kind: 'data', value })),
);

/** Generated fallback count: a non-negative integer or `null` (coalesced to 0). */
const fallbackCountArb = fc.oneof(fc.nat({ max: 100_000_000 }), fc.constant(null));

/** Expected result derived from the behavior + fallback, mirroring the contract. */
function expectedResult(behavior: RpcBehavior, fallbackCount: number | null) {
  if (behavior.kind === 'data') {
    const usable = usableCount(behavior.value);
    if (usable !== null) {
      return { count: usable, isEstimated: true } as const;
    }
  }
  return { count: fallbackCount ?? 0, isEstimated: false } as const;
}

describe('getListCount — Property 10: estimated-count failure falls back to exact', () => {
  it('returns the estimate when usable, otherwise the exact fallback, and never throws', async () => {
    await fc.assert(
      fc.asyncProperty(
        behaviorArb,
        fallbackCountArb,
        async (behavior, fallbackCount) => {
          let fallbackCalls = 0;

          // Instrumented fake: only `.rpc` is exercised by getListCount. No real
          // Supabase client, DB, or network is involved.
          const fakeClient = {
            rpc(_fn: string, _args: unknown) {
              switch (behavior.kind) {
                case 'throw':
                  throw new Error('rpc threw synchronously');
                case 'reject':
                  return Promise.reject(new Error('rpc rejected'));
                case 'error':
                  return Promise.resolve({ data: null, error: behavior.error });
                case 'data':
                  return Promise.resolve({ data: behavior.value, error: null });
              }
            },
          };

          const exactFallback = () => {
            fallbackCalls += 1;
            return Promise.resolve({ count: fallbackCount });
          };

          // Must never throw regardless of how the estimate path fails.
          const result = await getListCount(
            fakeClient as unknown as ListCountClient,
            { table: 'profiles', filters: [], exactFallback },
          );

          const expected = expectedResult(behavior, fallbackCount);
          expect(result).toEqual(expected);

          if (expected.isEstimated) {
            // A usable estimate is returned verbatim; the exact fallback is not consulted.
            expect(fallbackCalls).toBe(0);
          } else {
            // Every failure/unusable path degrades to exactly one exact fallback read.
            expect(fallbackCalls).toBe(1);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
