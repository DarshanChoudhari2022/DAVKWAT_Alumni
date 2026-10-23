// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
const mocks = vi.hoisted(() => ({ admin: vi.fn(), reconcile: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }));
vi.mock('@/lib/payments/reconcile', () => ({ reconcilePayment: mocks.reconcile }));
import { GET } from './route';

describe('Hobby payment reconciliation cron', () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv('CRON_SECRET', 'private-secret');
    vi.stubEnv('EASEBUZZ_KEY', 'key'); vi.stubEnv('EASEBUZZ_SALT', 'salt'); vi.stubEnv('EASEBUZZ_ENV', 'production');
  });
  afterEach(() => vi.unstubAllEnvs());
  it('rejects missing or incorrect authorization before accessing payments', async () => {
    const response = await GET(new Request('https://example.com/api/cron/reconcile-payments?secret=private-secret'));
    expect(response.status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('processes a bounded, fair batch and isolates per-payment failures', async () => {
    const query = { in: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn().mockResolvedValue({ data: [{ txnid: 'one' }, { txnid: 'two' }], error: null }) };
    query.in.mockReturnValue(query); query.eq.mockReturnValue(query); query.order.mockReturnValue(query);
    mocks.admin.mockReturnValue({ from: () => ({ select: () => query }) });
    mocks.reconcile.mockResolvedValueOnce({ status: 'success' }).mockRejectedValueOnce(new Error('DB unavailable'));
    const response = await GET(new Request('https://example.com/api/cron/reconcile-payments', { headers: { authorization: 'Bearer private-secret' } }));
    expect(await response.json()).toEqual({ checked: 2, confirmed: 1, errors: 1 });
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(query.order).toHaveBeenCalledWith('verification_checked_at', { ascending: true, nullsFirst: true });
    expect(query.eq).toHaveBeenCalledWith('gateway_response->>environment', 'production');
  });
  it('uses one daily schedule supported on Vercel Hobby', async () => {
    const config = JSON.parse(await readFile('vercel.json', 'utf8'));
    expect(config.crons).toEqual([{ path: '/api/cron/reconcile-payments', schedule: '0 2 * * *' }]);
  });
});
