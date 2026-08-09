import { describe, expect, it } from 'vitest';
import { getMembershipExpiryDate, isMembershipActive } from './membership';

describe('getMembershipExpiryDate', () => {
  it('grants annual membership for 12 calendar months from payment', () => {
    expect(getMembershipExpiryDate('annual', 12, '2026-08-09T14:30:00.000Z')).toBe(
      '2027-08-09T14:30:00.000Z'
    );
  });

  it('clamps leap-day memberships to the last day of February', () => {
    expect(getMembershipExpiryDate('annual', 12, '2024-02-29T10:00:00.000Z')).toBe(
      '2025-02-28T10:00:00.000Z'
    );
  });

  it('never expires lifetime membership', () => {
    expect(getMembershipExpiryDate('lifetime', null, '2026-08-09T14:30:00.000Z')).toBeNull();
  });

  it('treats annual membership as active through its expiry date', () => {
    expect(isMembershipActive(true, 'annual', '2027-08-09', new Date('2027-08-09T20:00:00Z'))).toBe(true);
    expect(isMembershipActive(true, 'annual', '2027-08-09', new Date('2027-08-10T00:00:00Z'))).toBe(false);
  });

  it('does not trust a paid boolean without a valid membership period', () => {
    expect(isMembershipActive(true, 'annual', null)).toBe(false);
    expect(isMembershipActive(false, 'lifetime', null)).toBe(false);
  });
});
