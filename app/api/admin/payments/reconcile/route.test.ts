// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ access: vi.fn(), reconcile: vi.fn() }));
vi.mock('@/lib/auth/admin-api', () => ({ requireAdminApiAccess: mocks.access }));
vi.mock('@/lib/payments/reconcile', () => ({ reconcilePayment: mocks.reconcile, ReconciliationError: class extends Error { statusCode = 503; } }));
import { POST } from './route';
function request(txnid: string) {
  return new Request('https://example.com/api/admin/payments/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txnid }) });
}
describe('admin gateway verification access', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('denies unsigned callers before any gateway request', async () => {
    mocks.access.mockResolvedValue({ adminAccess: null, error: new Response('Forbidden', { status: 403 }) });
    expect((await POST(request(`DAV${'a'.repeat(32)}`)))?.status).toBe(403);
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });
  it('lets an authenticated admin verify only a valid stored transaction reference', async () => {
    mocks.access.mockResolvedValue({ adminAccess: {}, error: null });
    mocks.reconcile.mockResolvedValue({ status: 'success', checked: true });
    const txnid = `DAV${'a'.repeat(32)}`;
    expect((await POST(request(txnid)))?.status).toBe(200);
    expect(mocks.reconcile).toHaveBeenCalledWith(txnid, 'admin');
  });
  it('rejects arbitrary input instead of sending it to Easebuzz', async () => {
    mocks.access.mockResolvedValue({ adminAccess: {}, error: null });
    expect((await POST(request('https://untrusted.example')))?.status).toBe(400);
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });
});
