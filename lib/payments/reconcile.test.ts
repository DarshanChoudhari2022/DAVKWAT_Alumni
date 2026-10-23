import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ admin: vi.fn(), retrieve: vi.fn(), finalize: vi.fn(), log: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }));
vi.mock('@/lib/easebuzz/retrieve', () => ({ retrievePayment: mocks.retrieve }));
vi.mock('./callback', () => ({ processEasebuzzCallback: mocks.finalize }));
vi.mock('./verification-log', () => ({ recordVerification: mocks.log }));
import { reconcilePayment } from './reconcile';

function database(overrides: Record<string, unknown> = {}) {
  const payment = { txnid: 'DAV123', status: 'pending', alumni_id: 'member', verification_checked_at: null,
    gateway_response: { provider: 'easebuzz', environment: 'production' }, ...overrides };
  const query = { eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: payment, error: null }) };
  query.eq.mockReturnValue(query);
  mocks.admin.mockReturnValue({ from: () => ({ select: () => query }), rpc: vi.fn().mockResolvedValue({ data: true, error: null }) });
  return query;
}
describe('payment reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv('EASEBUZZ_KEY', 'key'); vi.stubEnv('EASEBUZZ_SALT', 'salt'); vi.stubEnv('EASEBUZZ_ENV', 'production');
    mocks.retrieve.mockResolvedValue({ txnid: 'DAV123', status: 'success' });
    mocks.finalize.mockResolvedValue({ status: 'success' });
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each(['pending', 'failed'])('recovers a %s payment through the existing atomic finalizer', async (status) => {
    database({ status });
    expect(await reconcilePayment('DAV123', 'admin')).toEqual({ status: 'success', checked: true });
    expect(mocks.finalize).toHaveBeenCalledWith({ txnid: 'DAV123', status: 'success' }, 'admin');
  });
  it('records a gateway outage without falsely marking payment failed', async () => {
    database(); mocks.retrieve.mockRejectedValue(new Error('timeout'));
    expect(await reconcilePayment('DAV123', 'cron')).toMatchObject({ status: 'pending', verificationPending: true });
    expect(mocks.log).toHaveBeenCalledWith('DAV123', 'cron', { error: 'gateway_lookup_unavailable' });
    expect(mocks.finalize).not.toHaveBeenCalled();
  });
  it('checks member ownership in the database query', async () => {
    const query = database(); query.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(reconcilePayment('DAV123', 'member', 'other')).rejects.toThrow('not found');
    expect(query.eq).toHaveBeenCalledWith('alumni_id', 'other');
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
  it('does not re-grant an already successful payment', async () => {
    database({ status: 'success' });
    expect(await reconcilePayment('DAV123', 'cron')).toEqual({ status: 'success', checked: false });
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
  it('enforces cooldowns on repeated checks', async () => {
    database({ verification_checked_at: new Date().toISOString() });
    expect((await reconcilePayment('DAV123', 'admin')).checked).toBe(false);
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
  it('does not contact the gateway when another request already reserved the check', async () => {
    database();
    mocks.admin().rpc.mockResolvedValue({ data: false, error: null });
    expect(await reconcilePayment('DAV123', 'member', 'member')).toMatchObject({ checked: false, verificationPending: true });
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
  it('does not turn an old failed result into a newly confirmed failure during cooldown', async () => {
    database({ status: 'failed', verification_checked_at: new Date().toISOString() });
    expect(await reconcilePayment('DAV123', 'member', 'member')).toMatchObject({ verificationPending: true, checked: false });
    expect(mocks.finalize).not.toHaveBeenCalled();
  });
  it('keeps a database finalization failure retryable', async () => {
    database(); mocks.finalize.mockRejectedValue(new Error('database unavailable'));
    await expect(reconcilePayment('DAV123', 'admin')).rejects.toThrow('database unavailable');
  });
  it('rejects transactions from a different gateway environment', async () => {
    database({ gateway_response: { provider: 'easebuzz', environment: 'test' } });
    await expect(reconcilePayment('DAV123', 'admin')).rejects.toThrow('environment');
    expect(mocks.retrieve).not.toHaveBeenCalled();
  });
});
