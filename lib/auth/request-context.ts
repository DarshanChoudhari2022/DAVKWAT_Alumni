import { cache } from 'react';

/**
 * Request-scoped single-flight memoization for auth resolution.
 *
 * React `cache()` only dedupes within a single render pass, which is not enough
 * across Suspense boundaries during streaming (the layout, page, and each
 * streamed child are separate render passes that can run concurrently). To get a
 * single resolution shared across the whole Request_Context we store the in-flight
 * promise in a request-stable holder.
 *
 * `getHolder` is wrapped with React `cache()`, which returns the *same* object for
 * the life of one request (and a fresh object for the next request). Because the
 * holder is keyed by the `resolveActorProfile` boolean, the `true` and `false`
 * variants resolve independently within one request while each remains single-flight.
 * This also prevents cross-request leakage: each request gets its own module-isolated
 * holder via the `cache()`-returned object.
 *
 * This module intentionally does NOT import `admin-access.ts`. The loader is passed
 * in by the caller so the dependency direction stays one-way (`admin-access` imports
 * `request-context`, never the reverse), avoiding a circular import. Task 4.3 will
 * pass `readAdminAccess` as the loader and get back a memoized `AdminAccess | null`
 * promise shared by the layout, page, and all Suspense children.
 *
 * Requirements: 1.1 (resolve once per request, memoized), 1.2 (zero additional
 * lookups across layout/page/children), 1.7 (concurrent Suspense children share one
 * in-flight resolution).
 */

/**
 * Request-stable container for a memoized in-flight resolution. One instance exists
 * per `(request, resolveActorProfile)` pair because it is produced by a `cache()`-wrapped
 * factory.
 */
export interface RequestMemoHolder<T> {
  promise: Promise<T> | null;
}

/**
 * Returns the request-stable holder for the given `resolveActorProfile` value.
 *
 * The argument is unused in the body but is significant: React `cache()` keys the
 * returned object by the call arguments, so each distinct boolean yields its own
 * stable holder for the duration of the request. This keying is what stops the
 * `true` and `false` variants from colliding on a single shared promise.
 */
const getHolder = cache(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (_resolveActorProfile: boolean): RequestMemoHolder<unknown> => ({ promise: null })
);

/**
 * The shape of an auth loader passed to {@link resolveOnce}. It receives the
 * `resolveActorProfile` flag and returns a promise of the resolved value
 * (e.g. `AdminAccess | null`).
 */
export type RequestScopedLoader<T> = (resolveActorProfile: boolean) => Promise<T>;

/**
 * Single-flight wrapper: ensures `loader(resolveActorProfile)` runs at most once per
 * Request_Context for a given `resolveActorProfile` value. The first caller starts the
 * resolution and stores its promise on the request-stable holder; concurrent and
 * subsequent callers within the same request receive the same memoized promise.
 *
 * The parameter order mirrors the design's `resolveOnce(resolveActorProfile, loader)`
 * signature so callers (task 4.3) wire it through exactly as specified.
 *
 * @param resolveActorProfile Whether the loader should also resolve the actor profile.
 *        Also acts as the holder key so `true`/`false` are memoized independently.
 * @param loader The underlying resolution function (e.g. `readAdminAccess`).
 */
export function resolveOnce<T>(
  resolveActorProfile: boolean,
  loader: RequestScopedLoader<T>
): Promise<T> {
  const holder = getHolder(resolveActorProfile) as RequestMemoHolder<T>;

  if (!holder.promise) {
    holder.promise = loader(resolveActorProfile);
  }

  return holder.promise;
}
