// @vitest-environment node
import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { retrievePayment } from './retrieve';

function transaction(overrides: Record<string, string> = {}) {
  const p: Record<string, string> = { key: 'key', txnid: 'DAV123', amount: '500.0', status: 'success',
    firstname: 'Member', email: 'member@example.com', productinfo: 'Membership', udf1: 'member', udf2: 'plan', udf3: 'annual', ...overrides };
  p.hash = crypto.createHash('sha512').update(['salt', p.status, ...Array.from({ length: 10 }, (_, i) => p[`udf${10 - i}`] ?? ''),
    p.email, p.firstname, p.productinfo, p.amount, p.txnid, p.key].join('|')).digest('hex');
  return p;
}
describe('Easebuzz transaction retrieval', () => {
  beforeEach(() => { vi.stubEnv('EASEBUZZ_KEY', 'key'); vi.stubEnv('EASEBUZZ_SALT', 'salt'); vi.stubEnv('EASEBUZZ_ENV', 'production'); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it('authenticates the live response and signs the read-only merchant request', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: true, msg: transaction() })));
    vi.stubGlobal('fetch', request);
    expect((await retrievePayment('DAV123')).status).toBe('success');
    expect(request.mock.calls[0]![0]).toBe('https://dashboard.easebuzz.in/transaction/v2/retrieve');
    const body = new URLSearchParams(request.mock.calls[0]![1].body);
    expect(body.get('hash')).toBe(crypto.createHash('sha512').update('key|DAV123|salt').digest('hex'));
    expect(body.has('salt')).toBe(false);
  });
  it.each([{ ...transaction(), amount: '5000' }, transaction({ txnid: 'someone-else' })])('rejects tampered or unrelated transactions', async (msg) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: true, msg }))));
    await expect(retrievePayment('DAV123')).rejects.toThrow('authenticated');
  });
  it.each([{ status: false, msg: 'Not found' }, { status: true, msg: [] }])('does not interpret missing results as payment failure', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body))));
    await expect(retrievePayment('DAV123')).rejects.toThrow('verifiable');
  });
  it('propagates a timeout without inventing a payment result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    await expect(retrievePayment('DAV123')).rejects.toThrow('timeout');
  });
});
