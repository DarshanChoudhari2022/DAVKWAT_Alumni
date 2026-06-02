/**
 * Admin portal cache invalidation helper (design Section 4, "Invalidation" +
 * "Invalidation-failure fallback").
 *
 * This module owns two concerns:
 *
 *  1. The PURE action → cache-tag mapping (`invalidateForAction`) — the exact set of
 *     tags that must be invalidated for each administrator write action. This is the
 *     seam exercised by Property 8 ("Writes invalidate exactly the mapped cache tags",
 *     Req 4.4, 9.1): for any action it returns exactly the mapped tags, with no missing
 *     and no extra tags.
 *
 *  2. The effectful invalidation (`invalidateAfterAction`) that calls `revalidateTag`
 *     per mapped tag, each wrapped in try/catch. Because `revalidateTag` is in-process
 *     it rarely throws, but if it does the failed tag is recorded in a request-scoped
 *     "dirty set" so subsequent reads of the affected value bypass the cache and read
 *     directly from the database until a later invalidation of that tag succeeds. This
 *     is the defensive path behind Property 9 ("Invalidation failure forces cache
 *     bypass", Req 9.6).
 *
 * `next/cache` is server-only, so this module is server-only by construction: importing
 * it into a client component is a build error, which is the guarantee we rely on here.
 *
 * The dirty set is held in a React `cache()`-created holder (mirroring
 * `lib/auth/request-context.ts`) so it is isolated per request: a failed invalidation
 * on one request never forces cache bypass on an unrelated request.
 */

import { cache } from 'react';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, type CacheTag } from './admin-cache';

/**
 * The administrator write-action types that can invalidate cached values. One entry
 * per distinct write path in the design Section 4 invalidation table:
 *
 *  - `approve_reject` — approve/reject (`/api/admin/approve`, `/reject`)
 *  - `alumni_edit`    — alumni edit / membership change
 *  - `payment_status` — payment status change / manual membership
 *  - `settings_save`  — settings save (plans / site settings)
 *  - `event_publish`  — event publish / unpublish
 */
export type AdminWriteAction =
  | 'approve_reject'
  | 'alumni_edit'
  | 'payment_status'
  | 'settings_save'
  | 'event_publish';

/**
 * Exact action → cache-tag mapping (design Section 4 invalidation table). Centralized
 * here so the PURE `invalidateForAction` seam and the effectful `invalidateAfterAction`
 * share one source of truth.
 *
 * Each entry lists EXACTLY the tags mapped to that action — no missing tags, no extra
 * tags (Property 8 — Req 4.4, 9.1).
 */
const ACTION_TAG_MAP: Record<AdminWriteAction, readonly CacheTag[]> = {
  // approve/reject (`/api/admin/approve`, `/reject`)
  approve_reject: [CACHE_TAGS.statPendingApprovals, CACHE_TAGS.statDashboard],
  // alumni edit / membership change
  alumni_edit: [CACHE_TAGS.statDashboard, CACHE_TAGS.statPayments],
  // payment status change / manual membership
  payment_status: [CACHE_TAGS.statPayments, CACHE_TAGS.statDashboard],
  // settings save (plans / site settings)
  settings_save: [
    CACHE_TAGS.referenceMembershipPlans,
    CACHE_TAGS.referenceSiteSettings,
  ],
  // event publish/unpublish
  event_publish: [CACHE_TAGS.statDashboard],
};

/**
 * PURE mapping from a write action to the exact set of cache tags that action must
 * invalidate (Property 8 — Req 4.4, 9.1).
 *
 * Returns a fresh array (a copy of the canonical mapping) so callers cannot mutate the
 * internal table. Performs no I/O and reads no request state — safe to call anywhere
 * and is the seam the Property 8 test exercises directly.
 */
export function invalidateForAction(action: AdminWriteAction): CacheTag[] {
  return [...ACTION_TAG_MAP[action]];
}

// ─── Request-scoped dirty set (design "Invalidation-failure fallback", Req 9.6) ────

/**
 * Request-stable holder for the set of tags whose invalidation has failed on the
 * current request.
 *
 * `getDirtySet` is wrapped with React `cache()`, so it returns the SAME `Set` for the
 * life of one request and a fresh, empty `Set` for the next request. This mirrors the
 * `lib/auth/request-context.ts` holder pattern and guarantees a failed invalidation
 * cannot leak cache-bypass behavior across requests.
 */
const getDirtySet = cache((): Set<CacheTag> => new Set<CacheTag>());

/**
 * Records a tag as dirty for the current request (its invalidation failed). Subsequent
 * reads via {@link readWithDirtyBypass} will bypass the cache for this tag until it is
 * cleared by a later successful invalidation.
 */
function markTagDirty(tag: CacheTag): void {
  getDirtySet().add(tag);
}

/**
 * Clears a tag from the request-scoped dirty set after its invalidation succeeds, so
 * reads return to the cached path (design "Invalidation-failure fallback"). Exposed so
 * a successful re-invalidation can "heal" a previously dirty tag.
 */
export function clearTagDirty(tag: CacheTag): void {
  getDirtySet().delete(tag);
}

/**
 * Whether a tag is currently marked dirty on this request (its last invalidation
 * failed and no later invalidation has succeeded). Exposed for callers/tests that need
 * to inspect bypass state without performing a read.
 */
export function isTagDirty(tag: CacheTag): boolean {
  return getDirtySet().has(tag);
}

/** Result of an {@link invalidateAfterAction} call: which mapped tags succeeded vs. failed. */
export interface InvalidateResult {
  /** Tags whose `revalidateTag` call completed without throwing. */
  succeeded: CacheTag[];
  /** Tags whose `revalidateTag` call threw and were marked dirty. */
  failed: CacheTag[];
}

/**
 * Invalidate exactly the cache tags mapped to `action` (Req 4.4, 9.1).
 *
 * For each mapped tag, `revalidateTag` is called inside its own try/catch:
 *  - On success the tag is cleared from the request-scoped dirty set (so reads return
 *    to the cached path — this is how a later successful invalidation "heals" a tag
 *    that previously failed).
 *  - On failure the tag is recorded in the dirty set so {@link readWithDirtyBypass}
 *    bypasses the cache to the DB for that tag until a later invalidation succeeds
 *    (Req 9.6 — Property 9).
 *
 * Failures are isolated per tag: one tag throwing never prevents the remaining mapped
 * tags from being invalidated. Returns the per-tag success/failure breakdown.
 */
export function invalidateAfterAction(action: AdminWriteAction): InvalidateResult {
  const tags = invalidateForAction(action);
  const succeeded: CacheTag[] = [];
  const failed: CacheTag[] = [];

  for (const tag of tags) {
    try {
      revalidateTag(tag);
      clearTagDirty(tag);
      succeeded.push(tag);
    } catch {
      markTagDirty(tag);
      failed.push(tag);
    }
  }

  return { succeeded, failed };
}

/**
 * Read wrapper enforcing the invalidation-failure fallback (Req 9.6 — Property 9).
 *
 * While `tag` is in the request-scoped dirty set (its last invalidation failed),
 * `freshRead` is invoked to read directly from the database, bypassing the cache so a
 * stale value is never served after a failed invalidation. Once the tag's invalidation
 * later succeeds (clearing it from the dirty set), reads return to the cached path via
 * `cachedRead`.
 *
 * @param tag        The cache tag governing this value.
 * @param cachedRead The normal cached read (e.g. an `unstable_cache` wrapper).
 * @param freshRead  A direct, cache-bypassing DB read used while the tag is dirty.
 */
export function readWithDirtyBypass<T>(
  tag: CacheTag,
  cachedRead: () => Promise<T>,
  freshRead: () => Promise<T>
): Promise<T> {
  return isTagDirty(tag) ? freshRead() : cachedRead();
}
