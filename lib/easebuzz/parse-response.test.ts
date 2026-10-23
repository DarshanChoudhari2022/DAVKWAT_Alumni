// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/payments/callback', () => ({ PaymentCallbackError: class extends Error {} }));
import { parseEasebuzzResponse } from './parse-response';

describe('gateway response parsing', () => {
  it('accepts browser form returns', async () => {
    expect(await parseEasebuzzResponse(new Request('https://example.com', { method: 'POST', body: new URLSearchParams({ txnid: 'DAV123', amount: '500.0' }) })))
      .toEqual({ txnid: 'DAV123', amount: '500.0' });
  });
  it('accepts JSON webhooks without coercing nested untrusted objects', async () => {
    expect(await parseEasebuzzResponse(new Request('https://example.com', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txnid: 'DAV123', amount: 500, nested: { status: 'success' } }) })))
      .toEqual({ txnid: 'DAV123', amount: '500' });
  });
  it('rejects malformed JSON', async () => {
    await expect(parseEasebuzzResponse(new Request('https://example.com', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '[' })))
      .rejects.toThrow('format');
  });
});
