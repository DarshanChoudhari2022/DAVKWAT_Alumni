export const MEMBERSHIP_PRICES = { annual: 500, lifetime: 5000 } as const;
export type PaidMembershipType = keyof typeof MEMBERSHIP_PRICES;

export function membershipForAmount(value: unknown): PaidMembershipType | null {
  if (value === '500' || value === 500) return 'annual';
  if (value === '5000' || value === 5000) return 'lifetime';
  return null;
}
