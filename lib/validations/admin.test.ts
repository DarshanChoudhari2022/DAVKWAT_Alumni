import { describe, expect, it } from 'vitest';
import {
  deleteAlumniSchema,
  manualPaymentStatusSchema,
  membershipPlanSchema,
} from './admin';

describe('admin validations', () => {
  it('allows only annual and lifetime membership plans', () => {
    expect(
      membershipPlanSchema.safeParse({
        name: 'Annual Membership',
        amount: 500,
        membership_type: 'annual',
        duration_months: 12,
        is_active: true,
      }).success
    ).toBe(true);

    expect(
      membershipPlanSchema.safeParse({
        name: 'Monthly Membership',
        amount: 100,
        membership_type: 'monthly',
        duration_months: 1,
        is_active: true,
      }).success
    ).toBe(false);
  });

  it('requires exact Delete confirmation for permanent alumni deletion', () => {
    expect(
      deleteAlumniSchema.safeParse({
        confirmationText: 'Delete',
      }).success
    ).toBe(true);

    expect(
      deleteAlumniSchema.safeParse({
        confirmationText: 'delete',
      }).success
    ).toBe(false);
  });

  it('validates manual payment status updates', () => {
    expect(
      manualPaymentStatusSchema.safeParse({
        paymentId: '11111111-1111-4111-8111-111111111111',
        status: 'success',
      }).success
    ).toBe(true);

    expect(
      manualPaymentStatusSchema.safeParse({
        paymentId: '11111111-1111-4111-8111-111111111111',
        status: 'refunded',
      }).success
    ).toBe(false);
  });
});
