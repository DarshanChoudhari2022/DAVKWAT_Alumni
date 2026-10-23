import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(), verify: vi.fn(), receipt: vi.fn(), invalidate: vi.fn(),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock('@/lib/easebuzz/verify', () => ({ verifyPaymentHash: mocks.verify }));
vi.mock('@/lib/cache/invalidate', () => ({ invalidateAfterAction: mocks.invalidate }));
vi.mock('./membership', () => ({ sendPaymentReceiptEmail: mocks.receipt }));
vi.mock('./verification-log', () => ({ recordVerification: vi.fn() }));
import { processEasebuzzCallback } from './callback';

const params = {
  txnid: 'DAV123', amount: '500.00', status: 'success', hash: 'signed',
  productinfo: 'DAVKAWT Annual Membership', firstname: 'Asha Kumar', email: 'asha@example.com',
  udf1: 'member-1', udf2: 'plan-1', udf3: 'annual', udf4: '12', udf5: 'registration',
};

function database(result: unknown = { status: 'success', duplicate: false }, rpcError: unknown = null) {
  const payment = { id: 'payment-1', alumni_id: 'member-1', plan_id: 'plan-1', amount: 500, currency: 'INR',
    gateway_response: { provider: 'easebuzz', environment: 'test', request: params } };
  const maybeSingle = vi.fn().mockResolvedValue({ data: payment, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const rpc = vi.fn().mockResolvedValue({ data: result, error: rpcError });
  mocks.createAdminClient.mockReturnValue({ from, rpc });
  return { rpc, maybeSingle };
}

describe('Easebuzz callback processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('EASEBUZZ_KEY', 'test-key'); vi.stubEnv('EASEBUZZ_SALT', 'test-salt'); vi.stubEnv('EASEBUZZ_ENV', 'test');
    mocks.verify.mockReturnValue(true);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('finalizes only a matching signed payment, atomically, and sends a receipt', async () => {
    const { rpc } = database();
    expect(await processEasebuzzCallback(params)).toEqual({ status: 'success', duplicate: false, source: 'registration' });
    expect(rpc).toHaveBeenCalledWith('finalize_easebuzz_payment', { p_txnid: 'DAV123', p_status: 'success', p_response: params });
    expect(mocks.receipt).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid signatures before database access', async () => {
    mocks.verify.mockReturnValue(false);
    await expect(processEasebuzzCallback(params)).rejects.toThrow('signature');
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });
  it.each([{ amount: '5000.00' }, { udf1: 'another-member' }, { udf3: 'lifetime' }, { udf2: 'another-plan' }, { email: 'other@example.com' }])(
    'rejects a callback that does not match the stored payment: %j', async (overrides) => {
      const { rpc } = database();
      await expect(processEasebuzzCallback({ ...params, ...overrides })).rejects.toThrow('do not match');
      expect(rpc).not.toHaveBeenCalled();
    }
  );
  it('does not send duplicate receipts or grant membership outside the atomic RPC', async () => {
    database({ status: 'success', duplicate: true });
    expect((await processEasebuzzCallback(params)).duplicate).toBe(true);
    expect(mocks.receipt).not.toHaveBeenCalled();
  });
  it('does not acknowledge a failed database write as success', async () => {
    database(null, { message: 'connection failure' });
    await expect(processEasebuzzCallback(params)).rejects.toThrow('Could not finalize');
    expect(mocks.receipt).not.toHaveBeenCalled();
  });
  it('records a failed payment without granting membership', async () => {
    const { rpc } = database({ status: 'failed', duplicate: false });
    expect((await processEasebuzzCallback({ ...params, status: 'failure' })).status).toBe('failed');
    expect(rpc).toHaveBeenCalledWith('finalize_easebuzz_payment', expect.objectContaining({ p_status: 'failed' }));
    expect(mocks.receipt).not.toHaveBeenCalled();
  });
});
