import { describe, expect, it } from 'vitest';
import { formatCount, type CountResult } from '@/lib/db/count-format';

describe('formatCount', () => {
  it('formats an exact count with thousands separators and no indicator', () => {
    const result: CountResult = { count: 1200, isEstimated: false };
    expect(formatCount(result)).toBe('1,200');
  });

  it('prefixes ~ and appends (approximate) for an estimated count', () => {
    const result: CountResult = { count: 1200, isEstimated: true };
    expect(formatCount(result)).toBe('~1,200 (approximate)');
  });

  it('never labels an estimate as exact and never labels an exact as estimate', () => {
    const exact = formatCount({ count: 42, isEstimated: false });
    const estimated = formatCount({ count: 42, isEstimated: true });

    // Approximate indicator present iff isEstimated is true.
    expect(exact.includes('~')).toBe(false);
    expect(exact.includes('approximate')).toBe(false);
    expect(estimated.includes('~')).toBe(true);
    expect(estimated.includes('approximate')).toBe(true);
  });

  it('handles zero', () => {
    expect(formatCount({ count: 0, isEstimated: false })).toBe('0');
    expect(formatCount({ count: 0, isEstimated: true })).toBe('~0 (approximate)');
  });
});
