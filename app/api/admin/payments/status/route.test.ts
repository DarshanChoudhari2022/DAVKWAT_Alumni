// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ access: vi.fn(), rpc: vi.fn(), read: vi.fn() }));
vi.mock('@/lib/auth/admin-api', () => ({ requireAdminApiAccess: mocks.access }));
vi.mock('@/lib/audit', () => ({ writeAuditLog: vi.fn() }));
vi.mock('@/lib/cache/invalidate', () => ({ invalidateAfterAction: vi.fn() }));
vi.mock('next/server', async (importOriginal) => ({
  ...await importOriginal<typeof import('next/server')>(), after: vi.fn(),
}));
import { POST } from './route';

const paymentId = '11111111-1111-4111-8111-111111111111';
function request() {
  return new NextRequest('https://davkawt.org/api/admin/payments/status', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, status: 'success' }),
  });
}

describe('admin manual payment review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ adminAccess: {
      actorProfileId: paymentId,
      database: { rpc: mocks.rpc, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }) }) },
    }, error: null });
    mocks.rpc.mockResolvedValue({ data: { payment_id: paymentId, alumni_id: paymentId }, error: null });
  });

  it.each([
    { gateway_response: { provider: 'easebuzz', environment: 'production' }, payment_mode: 'UPI' },
    { easebuzz_payment_id: 'live-reference', payment_mode: 'CC' },
    { payment_mode: 'easebuzz' },
  ])('blocks manually marking gateway payments successful: %j', async (payment) => {
    mocks.read.mockResolvedValue({ data: payment, error: null });
    expect((await POST(request())).status).toBe(409);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('preserves review for historical manual payments', async () => {
    mocks.read.mockResolvedValue({ data: { payment_mode: 'manual_upi', gateway_response: {} }, error: null });
    expect((await POST(request())).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('review_manual_payment', expect.objectContaining({ p_payment_id: paymentId }));
  });

  it('does not write when reading the payment fails', async () => {
    mocks.read.mockResolvedValue({ data: null, error: { message: 'Unavailable' } });
    expect((await POST(request())).status).toBe(500);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
