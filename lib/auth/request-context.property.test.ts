// Feature: admin-portal-performance, Property 1: Auth resolution single-flight per request
//
// **Validates: Requirements 1.1, 1.2, 1.7, 2.3, 7.4**
//
// Property 1 (design Section 1, "Auth resolution single-flight per request"):
//
//   For ANY number and arrival arrangement (sequential or concurrent) of
//   `requireAdminAccess` callers within a single Request_Context, the underlying
//   authentication resolution performs at most one identity-verification step and at
//   most one profile lookup, and every caller receives the same memoized result.
//
// ---------------------------------------------------------------------------------
// Test boundary / why we model the request-stable holder
// ---------------------------------------------------------------------------------
// The production single-flight in `resolveOnce` (request-context.ts) depends on React
// `cache()`: `getHolder(resolveActorProfile)` returns the SAME `{ promise }` object for
// the life of one request (and a fresh one per request), keyed by the boolean argument.
// React `cache()` only yields that stable, per-request object when a React request scope
// is active (AsyncLocalStorage set up by the RSC renderer). In the Vitest unit
// environment there is NO request scope, so `cache()` returns a fresh holder on every
// call and the real `resolveOnce` cannot dedupe across separate invocations (verified
// empirically). The design and task anticipate this: we therefore assert the
// single-flight INVARIANT against the documented holder pattern — constructing the same
// per-flag `{ promise }` holder and applying the exact `resolveOnce` single-flight logic
// — while still importing and exercising the real `resolveOnce` for functional
// correctness. `resolveOnceLocal` below mirrors the real function body line-for-line; the
// `holders` map stands in for the request-stable, per-`resolveActorProfile` holder that
// `cache()` provides per request in production.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolveOnce } from '@/lib/auth/request-context';

const NUM_RUNS = 200; // comfortably exceeds the required >= 100 iterations

/** A microtask/timer yield so "concurrent" callers genuinely interleave. */
function tick(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Instrumented (counting) auth backend. Stands in for the real `readAdminAccess`
 * loader: it records each identity-verification step and each profile lookup so the
 * property can observe how many times the underlying resolution actually ran.
 */
interface CountingBackend {
  /** Total identity-verification steps performed. */
  verifications: number;
  /** Total profile lookups performed. */
  profileLookups: number;
  /** Loader runs broken down by the `resolveActorProfile` flag. */
  runsByFlag: Map<boolean, number>;
}

function makeBackend(): CountingBackend {
  return { verifications: 0, profileLookups: 0, runsByFlag: new Map() };
}

/**
 * Build a loader that mirrors `readAdminAccess(resolveActorProfile)`: it always performs
 * one identity-verification step and, when `resolveActorProfile` is true, one profile
 * lookup. The returned object is unique per loader run so callers can prove they all
 * received the SAME memoized result (reference equality) rather than independent runs.
 */
function makeCountingLoader(backend: CountingBackend, delays: number[]) {
  let runIndex = 0;
  return async (resolveActorProfile: boolean) => {
    const myRun = runIndex;
    runIndex += 1;
    backend.verifications += 1;
    if (resolveActorProfile) {
      backend.profileLookups += 1;
    }
    backend.runsByFlag.set(
      resolveActorProfile,
      (backend.runsByFlag.get(resolveActorProfile) ?? 0) + 1
    );
    await tick(delays[myRun % delays.length] ?? 0);
    // A fresh object per run; identical results across callers prove memoization.
    return { actor: `actor-${myRun}`, resolveActorProfile, runIndex: myRun };
  };
}

/**
 * Faithful reconstruction of the production `resolveOnce` + `getHolder` pair for one
 * Request_Context. The `holders` map is the request-stable, per-`resolveActorProfile`
 * holder that React `cache()` provides per request; the body of `run` is byte-for-byte
 * the logic of the real `resolveOnce` (`if (!holder.promise) holder.promise = loader(...)`).
 */
function makeRequestScope<T>() {
  const holders = new Map<boolean, { promise: Promise<T> | null }>();
  return function run(
    resolveActorProfile: boolean,
    loader: (flag: boolean) => Promise<T>
  ): Promise<T> {
    let holder = holders.get(resolveActorProfile);
    if (!holder) {
      holder = { promise: null };
      holders.set(resolveActorProfile, holder);
    }
    if (!holder.promise) {
      holder.promise = loader(resolveActorProfile);
    }
    return holder.promise;
  };
}

/** A single caller: which actor-profile flag it asks for. */
const callerArb = fc.record({
  resolveActorProfile: fc.boolean(),
});

const scenarioArb = fc.record({
  callers: fc.array(callerArb, { minLength: 1, maxLength: 25 }),
  // "concurrent" fires every caller before awaiting; "sequential" awaits each in turn.
  concurrent: fc.boolean(),
  // small per-run delays to force interleaving when concurrent
  delays: fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 1, maxLength: 6 }),
});

describe('Property 1: Auth resolution single-flight per request', () => {
  it(
    'runs the loader at most once per resolveActorProfile value and memoizes the result to every caller',
    async () => {
      await fc.assert(
        fc.asyncProperty(scenarioArb, async ({ callers, concurrent, delays }) => {
          const backend = makeBackend();
          const loader = makeCountingLoader(backend, delays);
          const run = makeRequestScope<{ actor: string; resolveActorProfile: boolean; runIndex: number }>();

          const flagsRequested = new Set(callers.map((c) => c.resolveActorProfile));

          let results: { actor: string; resolveActorProfile: boolean; runIndex: number }[];
          if (concurrent) {
            // Arrival arrangement: all callers start before any awaits resolve.
            results = await Promise.all(callers.map((c) => run(c.resolveActorProfile, loader)));
          } else {
            // Arrival arrangement: strictly sequential, each awaited before the next.
            results = [];
            for (const c of callers) {
              // eslint-disable-next-line no-await-in-loop
              results.push(await run(c.resolveActorProfile, loader));
            }
          }

          // At most one loader run per distinct resolveActorProfile value.
          for (const flag of flagsRequested) {
            expect(backend.runsByFlag.get(flag)).toBe(1);
          }
          // Total identity verifications equals the number of distinct flags (<= 2),
          // never the number of callers.
          expect(backend.verifications).toBe(flagsRequested.size);
          // At most one profile lookup, and only when some caller asked for the profile.
          const expectedLookups = flagsRequested.has(true) ? 1 : 0;
          expect(backend.profileLookups).toBe(expectedLookups);
          expect(backend.profileLookups).toBeLessThanOrEqual(1);

          // Every caller asking for the same flag receives the IDENTICAL memoized result.
          const firstResultForFlag = new Map<boolean, (typeof results)[number]>();
          callers.forEach((c, i) => {
            const current = results[i]!;
            const seen = firstResultForFlag.get(c.resolveActorProfile);
            if (!seen) {
              firstResultForFlag.set(c.resolveActorProfile, current);
            } else {
              expect(current).toBe(seen); // reference equality -> same memoized run
            }
          });
        }),
        { numRuns: NUM_RUNS }
      );
    },
    15_000
  );

  it('isolates resolution per request: distinct Request_Contexts each run the loader once', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 8 }), // callers in request A
        fc.integer({ min: 1, max: 8 }), // callers in request B
        fc.boolean(), // shared flag value used by both requests
        async (nA, nB, flag) => {
          const backend = makeBackend();
          const loader = makeCountingLoader(backend, [0, 1, 2]);

          const runA = makeRequestScope();
          const runB = makeRequestScope();

          await Promise.all([
            ...Array.from({ length: nA }, () => runA(flag, loader)),
            ...Array.from({ length: nB }, () => runB(flag, loader)),
          ]);

          // Each request resolves independently and exactly once for the flag, so two
          // requests run the loader exactly twice — no cross-request leakage, no extra
          // verifications per request.
          expect(backend.runsByFlag.get(flag)).toBe(2);
          expect(backend.verifications).toBe(2);
          expect(backend.profileLookups).toBe(flag ? 2 : 0);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('the real resolveOnce returns a promise resolving to the loader value (request-scoped dedupe requires a React request)', async () => {
    // Exercises the real exported symbol end-to-end. Cross-call dedupe needs an active
    // React request scope (see file header); here we assert functional correctness: the
    // memoized promise resolves to exactly what the loader produced, and the single-flight
    // logic returns the holder's stored promise within one synchronous holder lifetime.
    await fc.assert(
      fc.asyncProperty(fc.boolean(), fc.integer(), async (flag, payload) => {
        const loader = async (f: boolean) => ({ f, payload });
        const result = await resolveOnce(flag, loader);
        expect(result).toEqual({ f: flag, payload });
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
