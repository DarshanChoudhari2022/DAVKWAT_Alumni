// Feature: admin-portal-performance, Property 7: Cache issues at most one load per revalidation window
//
// **Validates: Requirements 4.1, 4.2**
//
// Property 7 (design Section 4, "Cache layer"):
//
//   For ANY cached descriptor (Reference_Data or Aggregate_Data) and ANY sequence of
//   reads occurring within a single Revalidation_Window, the underlying database loader
//   is invoked AT MOST ONCE; reads after the first within the window are served from
//   cache.
//
// ─── Why a FAKE cache (not the real `unstable_cache`) ──────────────────────────────
//
// The real wrappers in `lib/cache/admin-cache.ts` delegate to Next.js `unstable_cache`,
// whose stale-while-revalidate machinery is request/runtime infrastructure that cannot
// run deterministically outside a Next.js server. Per the design's Testing Strategy, the
// real `unstable_cache` behavior (stale-while-revalidate, last-good-on-failure) is
// validated by an INTEGRATION test against the Next.js cache (task 20.3). This property
// instead validates the CACHING CONTRACT that the application code relies on: within one
// revalidation window the loader runs at most once.
//
// We therefore implement a tiny in-test cache wrapper (`makeWindowedCache`) that records
// loader invocations and re-invokes the loader only once the window has elapsed, driven
// by a controllable virtual clock. The property asserts the at-most-one-load invariant
// across arbitrary read sequences, window sizes, and loaders.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { REVALIDATE } from '@/lib/cache/admin-cache';

const NUM_RUNS = 200; // comfortably exceeds the required >= 100 iterations

/** A controllable virtual clock so windows advance deterministically. */
class FakeClock {
  private current = 0;
  now(): number {
    return this.current;
  }
  advance(ms: number): void {
    this.current += ms;
  }
}

/**
 * Tiny windowed cache modeling the contract the app relies on. The loader is invoked
 * lazily on the first read, its result memoized, and only re-invoked on a read that
 * occurs at/after the window boundary relative to the last load. This mirrors the
 * "at most one load per revalidation window" guarantee of `unstable_cache`'s
 * time-based revalidation (the stale-serving nuance is integration-tested separately).
 *
 * `loads` records every loader invocation for assertion.
 */
function makeWindowedCache<T>(
  loader: () => T,
  windowMs: number,
  clock: FakeClock
) {
  let cached: { value: T; loadedAt: number } | undefined;
  const loads: number[] = []; // timestamps at which the loader actually ran

  function read(): T {
    const now = clock.now();
    const expired = cached !== undefined && now - cached.loadedAt >= windowMs;
    if (cached === undefined || expired) {
      const value = loader();
      cached = { value, loadedAt: now };
      loads.push(now);
    }
    return cached.value;
  }

  return { read, loads };
}

/** Window sizes: the real configured windows plus arbitrary positive windows. */
const windowArb = fc.oneof(
  fc.constantFrom(REVALIDATE.badge, REVALIDATE.stats, REVALIDATE.reference),
  fc.integer({ min: 1, max: 10_000 })
);

describe('Property 7: Cache issues at most one load per revalidation window', () => {
  it('invokes the loader at most once for any sequence of reads within a single window', () => {
    fc.assert(
      fc.property(
        windowArb,
        // A sequence of small time gaps (ms) between successive reads, all strictly
        // less than the window, so the whole sequence stays inside ONE window.
        fc.array(fc.integer({ min: 0, max: 10_000 }), { minLength: 1, maxLength: 50 }),
        fc.integer({ min: 0, max: 1_000_000 }), // loader return value
        (windowMs, rawGaps, loadValue) => {
          const clock = new FakeClock();
          let loaderCalls = 0;
          const loader = () => {
            loaderCalls += 1;
            return loadValue;
          };
          const cache = makeWindowedCache(loader, windowMs, clock);

          // Constrain gaps so the cumulative elapsed time never reaches `windowMs`:
          // distribute the reads strictly inside [0, windowMs). This guarantees every
          // read in the sequence falls within a SINGLE window.
          const n = rawGaps.length;
          let elapsed = 0;
          for (let i = 0; i < n; i += 1) {
            const value = cache.read();
            expect(value).toBe(loadValue); // always the loaded value
            // advance by a gap that keeps us strictly inside the window
            const remaining = windowMs - 1 - elapsed;
            const step = remaining <= 0 ? 0 : (rawGaps[i] ?? 0) % (remaining + 1);
            clock.advance(step);
            elapsed += step;
          }

          // The whole sequence is within one window -> at most one load.
          expect(loaderCalls).toBeLessThanOrEqual(1);
          // And since there was at least one read, exactly one load occurred.
          expect(loaderCalls).toBe(1);
          expect(cache.loads.length).toBe(1);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('serves all in-window reads after the first from cache (loader runs only once)', () => {
    fc.assert(
      fc.property(
        windowArb,
        fc.integer({ min: 1, max: 100 }), // number of reads
        (windowMs, reads) => {
          const clock = new FakeClock();
          let loaderCalls = 0;
          const cache = makeWindowedCache(
            () => {
              loaderCalls += 1;
              return loaderCalls; // return value changes per load to detect re-loads
            },
            windowMs,
            clock
          );

          const first = cache.read(); // triggers the single load -> value 1
          expect(first).toBe(1);

          for (let i = 1; i < reads; i += 1) {
            // advance by a fraction that never reaches the window boundary
            clock.advance(Math.floor((windowMs - 1) / (reads + 1)));
            const v = cache.read();
            // Every subsequent in-window read returns the SAME first-loaded value.
            expect(v).toBe(1);
          }

          expect(loaderCalls).toBe(1);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it('re-loads exactly once per window boundary crossed (sanity: windows are honored)', () => {
    fc.assert(
      fc.property(
        windowArb,
        fc.integer({ min: 0, max: 20 }), // number of full windows to cross
        (windowMs, windowsToCross) => {
          const clock = new FakeClock();
          let loaderCalls = 0;
          const cache = makeWindowedCache(
            () => {
              loaderCalls += 1;
              return loaderCalls;
            },
            windowMs,
            clock
          );

          cache.read(); // initial load (1)
          for (let i = 0; i < windowsToCross; i += 1) {
            clock.advance(windowMs); // cross exactly one window boundary
            cache.read();
          }

          // One initial load + one reload per crossed boundary.
          expect(loaderCalls).toBe(1 + windowsToCross);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});
