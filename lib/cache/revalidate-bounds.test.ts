/**
 * Configuration smoke test for the admin cache revalidate windows.
 *
 * This is NOT a property test — it is a simple guard that the bounded revalidation
 * windows in `lib/cache/admin-cache.ts` stay within the maximums mandated by
 * Requirement 4, and that every cached descriptor's window is bounded by its class.
 *
 * Validates: Requirements 4.5, 4.6, 4.7
 */

import { describe, it, expect } from 'vitest';
import {
  REVALIDATE,
  CACHE_DESCRIPTORS,
  type CacheClass,
} from '@/lib/cache/admin-cache';

// Maximum permitted revalidation window (seconds) per cache class (Req 4.5/4.6/4.7).
const CLASS_BOUND: Record<CacheClass, number> = {
  'aggregate-badge': 60, // Req 4.5: pending-approvals badge ≤ 60s
  'aggregate-stat': 120, // Req 4.7: other portal statistics ≤ 120s
  reference: 300, // Req 4.6: reference data ≤ 300s
};

describe('REVALIDATE window bounds', () => {
  it('keeps the badge window at or below 60 seconds (Req 4.5)', () => {
    expect(REVALIDATE.badge).toBeLessThanOrEqual(60);
  });

  it('keeps the stats window at or below 120 seconds (Req 4.7)', () => {
    expect(REVALIDATE.stats).toBeLessThanOrEqual(120);
  });

  it('keeps the reference window at or below 300 seconds (Req 4.6)', () => {
    expect(REVALIDATE.reference).toBeLessThanOrEqual(300);
  });
});

describe('CACHE_DESCRIPTORS revalidate windows are bounded by class', () => {
  // Guards against any single descriptor being mis-bounded relative to its class.
  for (const [name, descriptor] of Object.entries(CACHE_DESCRIPTORS)) {
    it(`'${name}' (${descriptor.class}) is within its class bound`, () => {
      const bound = CLASS_BOUND[descriptor.class];
      expect(bound).toBeDefined();
      expect(descriptor.revalidateSeconds).toBeGreaterThan(0);
      expect(descriptor.revalidateSeconds).toBeLessThanOrEqual(bound);
    });
  }
});
