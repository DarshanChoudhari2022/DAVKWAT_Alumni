// Feature: admin-portal-performance, Property 12: Approximate counts are labeled, exact counts are not
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { formatCount, type CountResult } from '@/lib/db/count-format';

/**
 * Property 12: Approximate counts are labeled, exact counts are not.
 *
 * For ANY CountResult, the rendered label includes the approximate indicator
 * (a leading '~' AND the substring 'approximate') if and only if `isEstimated`
 * is true; an estimated value is never presented as an exact total, and an
 * exact value is never decorated with the approximate indicator. The formatted
 * numeric portion always reflects the count value.
 *
 * **Validates: Requirements 9.3**
 */
describe('formatCount — Property 12: approximate counts are labeled, exact counts are not', () => {
  // Reasonable non-negative integers: 0, small, and large values. List counts
  // are never negative, so the generated input space mirrors the real domain.
  const countArb = fc.integer({ min: 0, max: 100_000_000 });

  it('labels iff isEstimated, and the numeric portion reflects the count', () => {
    fc.assert(
      fc.property(countArb, fc.boolean(), (count, isEstimated) => {
        const result: CountResult = { count, isEstimated };
        const output = formatCount(result);

        const hasTilde = output.includes('~');
        const hasApproximate = output.includes('approximate');

        // If-and-only-if labeling: both indicators present exactly when estimated.
        expect(hasTilde).toBe(isEstimated);
        expect(hasApproximate).toBe(isEstimated);

        // The formatted numeric portion always reflects the count value.
        const expectedNumber = new Intl.NumberFormat('en-IN').format(count);
        expect(output).toContain(expectedNumber);

        // Exact values carry no indicator; estimates carry both.
        if (isEstimated) {
          expect(output).toBe(`~${expectedNumber} (approximate)`);
        } else {
          expect(output).toBe(expectedNumber);
          expect(hasTilde).toBe(false);
          expect(hasApproximate).toBe(false);
        }
      }),
      { numRuns: 200 },
    );
  });
});
