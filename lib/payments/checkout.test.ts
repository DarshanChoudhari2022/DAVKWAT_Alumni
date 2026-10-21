import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ admin: vi.fn(), initiate: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }));
vi.mock('@/lib/easebuzz/initiate', () => ({ initiatePayment: mocks.initiate }));
import { startMembershipCheckout } from './checkout';

function database(amount: number, type: string) {
  const single = vi.fn().mockResolvedValue({ data: { id: 'plan-id', amount, membership_type: type }, error: null });
  const query = { eq: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: single };
  query.eq.mockReturnValue(query); query.order.mockReturnValue(query); query.limit.mockReturnValue(query);
  const insert = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue(query);
  mocks.admin.mockReturnValue({ from: vi.fn((name) => name === 'membership_plans' ? { select: () => query } : { insert, update }) });
  return { insert, update };
}

describe('membership checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv('EASEBUZZ_KEY', 'test-key'); vi.stubEnv('EASEBUZZ_SALT', 'test-salt');
    vi.stubEnv('EASEBUZZ_ENV', 'test'); vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://davkawt.org');
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each([['annual', 500, '12'], ['lifetime', 5000, '']] as const)(
    'saves the server-defined %s price and signed member identity before initiating', async (membershipType, amount, months) => {
      const { insert } = database(amount, membershipType);
      mocks.initiate.mockResolvedValue({ paymentUrl: 'https://testpay.easebuzz.in/pay/test' });
      const result = await startMembershipCheckout({ userId: 'member-id', fullName: 'Asha Kumar',
        email: 'asha@example.com', phone: '+919876543210', membershipType, source: 'registration' });
      expect(result.txnid).toMatch(/^DAV[a-f0-9]{32}$/);
      expect(insert).toHaveBeenCalledWith(expect.objectContaining({ amount, status: 'pending', alumni_id: 'member-id', plan_id: 'plan-id' }));
      expect(mocks.initiate).toHaveBeenCalledWith(expect.objectContaining({
        amount: amount.toFixed(2), udf1: 'member-id', udf2: 'plan-id', udf3: membershipType, udf4: months,
        udf5: 'registration', surl: 'https://davkawt.org/api/payments/verify',
      }));
      expect(insert.mock.invocationCallOrder[0]).toBeLessThan(mocks.initiate.mock.invocationCallOrder[0]!);
    }
  );
  it('rejects a mismatched catalog price before creating a payment', async () => {
    const { insert } = database(1, 'annual');
    await expect(startMembershipCheckout({ userId: 'member', fullName: 'Asha', email: 'a@example.com',
      phone: '9876543210', membershipType: 'annual', source: 'membership' })).rejects.toThrow('unavailable');
    expect(insert).not.toHaveBeenCalled(); expect(mocks.initiate).not.toHaveBeenCalled();
  });
  it('records initiation failure so checkout can be retried with a fresh transaction', async () => {
    const { update } = database(500, 'annual');
    mocks.initiate.mockResolvedValue({ error: 'Gateway unavailable' });
    await expect(startMembershipCheckout({ userId: 'member', fullName: 'Asha', email: 'a@example.com',
      phone: '9876543210', membershipType: 'annual', source: 'membership' })).rejects.toThrow('Gateway unavailable');
    expect(update).toHaveBeenCalledWith({ status: 'failed' });
  });
});
