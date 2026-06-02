// Feature: admin-portal-performance, Property 9: Invalidation failure forces cache bypass
//
// **Validates: Requirements 9.6**
//
// Property 9 (design Section 4, "Invalidation-failure fallback"):
//
//   For ANY committed write whose tag invalidation fails, subsequent reads of the
//   affected value BYPASS the cache and read directly from the database UNTIL a later
//   invalidation succeeds — so a stale value is never served after a failed
//   invalidation. Equivalently: a read returns `freshRead()` (DB bypass) if and only if
//   the tag is currently dirty, and returns `cachedRead()` once the tag is cleared.
//
// ─── Why the dirty-set logic is replicated here ────────────────────────────────────
//
// The bypass seam in `lib/cache/invalidate.ts` (`markTagDirty`/`isTagDirty`/
// `clearTagDirty`/`readWithDirtyBypass`) stores its dirty set in a React
// `cache()`-created holder so it is isolated PER REQUEST:
//
//     const getDirtySet = cache((): Set<CacheTag> => new Set());
//
// React `cache()` only memoizes WITHIN a request scope. Outside a request (i.e. in this
// Vitest process) each call to `getDirtySet()` returns a BRAND-NEW empty Set, so the
// exported functions cannot coordinate state across calls here — `isTagDirty` is always
// `false`, and `markTagDirty` is not even exported (a tag only becomes dirty when
// `invalidateAfterAction` catches a throwing `revalidateTag`, which itself requires a
// request scope). We confirmed this empirically: `cache(() => new Set())` returns a
// different Set on each call outside a request.
//
// Therefore, per the task guidance, we replicate the MINIMAL dirty-set + bypass logic
// (a byte-for-byte copy of the `readWithDirtyBypass` decision and the mark/clear/isDirty
// semantics) and assert the invariant over arbitrary operation sequences. We ALSO
// exercise the REAL exported seam on the only path observable outside a request — the
// clean (no-failed-invalidation) path — to prove the real code routes reads to the
// cached loader when nothing is dirty.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  readWithDirtyBypass,
  isTagDirty,
  clearTagDirty,
} from '@/lib/cache/invalidate';
import { CACHE_TAGS, type CacheTag } from '@/lib/cache/admin-cache';

const NUM_RUNS = 200; // comfortably exceeds the required >= 100 iterations

// ─── Replicated minimal model (mirrors lib/cache/invalidate.ts exactly) ────────────

/** Minimal per-request dirty set: the same add/delete/has semantics as the source. */
class DirtySetModel {
  private readonly set = new Set<string>();
  /** Mirrors `markTagDirty`: an invalidation failed → bypass cache for this tag. */
  mark(tag: string): void {
    this.set.add(tag);
  }
  /** Mirrors `clearTagDirty`: a later invalidation succeeded → return to cache. */
  clear(tag: string): void {
    this.set.delete(tag);
  }
  /** Mirrors `isTagDirty`. */
  isDirty(tag: string): boolean {
    return this.set.has(tag);
  }
}

type ReadOutcome = { source: 'fresh' | 'cached'; value: number };

/**
 * Byte-for-byte mirror of the source `readWithDirtyBypass` decision:
 *   `isTagDirty(tag) ? freshRead() : cachedRead()`.
 */
async function readWithDirtyBypassModel(
  dirty: DirtySetModel,
  tag: string,
  cachedRead: () => Promise<ReadOutcome>,
  freshRead: () => Promise<ReadOutcome>
): Promise<ReadOutcome> {
  return dirty.isDirty(tag) ? freshRead() : cachedRead();
}

// ─── Operation model for the property ──────────────────────────────────────────────

type Op =
  | { kind: 'mark' }
  | { kind: 'clear' }
  | { kind: 'read' };

const opArb: fc.Arbitrary<Op> = fc.oneof(
  fc.constant<Op>({ kind: 'mark' }),
  fc.constant<Op>({ kind: 'clear' }),
  fc.constant<Op>({ kind: 'read' })
);

/** A handful of real cache tags to operate over. */
const ALL_TAGS: CacheTag[] = Object.values(CACHE_TAGS);
const tagArb = fc.constantFrom(...ALL_TAGS);

/** A sequence of (op, tag) pairs — interleaving mark/clear/read across tags. */
const opSequenceArb = fc.array(fc.tuple(opArb, tagArb), {
  minLength: 1,
  maxLength: 40,
});

describe('Property 9: Invalidation failure forces cache bypass', () => {
  it('a read returns freshRead() (DB bypass) iff the tag is currently dirty', async () => {
    await fc.assert(
      fc.asyncProperty(opSequenceArb, async (ops) => {
        const dirty = new DirtySetModel();
        // Independent oracle: the set of tags that SHOULD currently be dirty.
        const expectedDirty = new Set<string>();

        // Distinct sentinel values so we can prove which loader actually ran.
        const cachedRead = async (): Promise<ReadOutcome> => ({ source: 'cached', value: 1 });
        const freshRead = async (): Promise<ReadOutcome> => ({ source: 'fresh', value: 2 });

        for (const [op, tag] of ops) {
          switch (op.kind) {
            case 'mark':
              dirty.mark(tag);
              expectedDirty.add(tag);
              break;
            case 'clear':
              dirty.clear(tag);
              expectedDirty.delete(tag);
              break;
            case 'read': {
              const outcome = await readWithDirtyBypassModel(
                dirty,
                tag,
                cachedRead,
                freshRead
              );
              const shouldBypass = expectedDirty.has(tag);
              // The core invariant: fresh (DB bypass) iff dirty, cached otherwise.
              expect(outcome.source).toBe(shouldBypass ? 'fresh' : 'cached');
              break;
            }
          }
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('once a tag is marked dirty, every read bypasses to DB until it is cleared', async () => {
    await fc.assert(
      fc.asyncProperty(
        tagArb,
        fc.integer({ min: 1, max: 8 }), // reads while dirty
        fc.integer({ min: 1, max: 8 }), // reads after clear
        async (tag, readsWhileDirty, readsAfterClear) => {
          const dirty = new DirtySetModel();
          let freshCalls = 0;
          let cachedCalls = 0;
          const cachedRead = async (): Promise<ReadOutcome> => {
            cachedCalls += 1;
            return { source: 'cached', value: 1 };
          };
          const freshRead = async (): Promise<ReadOutcome> => {
            freshCalls += 1;
            return { source: 'fresh', value: 2 };
          };

          // Failed invalidation -> tag dirty.
          dirty.mark(tag);
          for (let i = 0; i < readsWhileDirty; i += 1) {
            const out = await readWithDirtyBypassModel(dirty, tag, cachedRead, freshRead);
            expect(out.source).toBe('fresh'); // never serve the cached/stale value
          }
          expect(freshCalls).toBe(readsWhileDirty);
          expect(cachedCalls).toBe(0);

          // A later invalidation succeeds -> tag cleared -> reads return to cache.
          dirty.clear(tag);
          for (let i = 0; i < readsAfterClear; i += 1) {
            const out = await readWithDirtyBypassModel(dirty, tag, cachedRead, freshRead);
            expect(out.source).toBe('cached');
          }
          expect(cachedCalls).toBe(readsAfterClear);
          expect(freshCalls).toBe(readsWhileDirty); // unchanged after clear
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  // Real-seam coverage on the only path observable outside a request scope: with no
  // failed invalidation, the request-scoped dirty set is empty, so the REAL exported
  // `readWithDirtyBypass` must route every read through the cached loader and never the
  // fresh (DB-bypass) loader, and `isTagDirty` must report false.
  it('real readWithDirtyBypass uses the cached loader when no invalidation has failed', async () => {
    await fc.assert(
      fc.asyncProperty(tagArb, async (tag) => {
        // No invalidation has failed on this (non-request) scope -> not dirty.
        expect(isTagDirty(tag)).toBe(false);
        // clearing a non-dirty tag is a safe no-op.
        clearTagDirty(tag);
        expect(isTagDirty(tag)).toBe(false);

        let freshCalls = 0;
        let cachedCalls = 0;
        const out = await readWithDirtyBypass(
          tag,
          async () => {
            cachedCalls += 1;
            return 'cached-value';
          },
          async () => {
            freshCalls += 1;
            return 'fresh-value';
          }
        );

        expect(out).toBe('cached-value');
        expect(cachedCalls).toBe(1);
        expect(freshCalls).toBe(0);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
