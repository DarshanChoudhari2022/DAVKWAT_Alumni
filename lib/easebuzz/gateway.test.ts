import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initiatePayment } from './initiate';
import { verifyPaymentHash } from './verify';

const payment = {
  txnid: 'DAVTEST123', amount: '500.00', productinfo: 'DAVKAWT Annual Membership',
  firstname: 'Test Member', email: 'test@example.com', phone: '9876543210',
  surl: 'https://example.com/api/payments/verify', furl: 'https://example.com/api/payments/verify',
  udf1: 'member-id', udf2: 'plan-id', udf3: 'annual', udf4: '12', udf5: 'registration',
};

describe('Easebuzz hosted checkout', () => {
  beforeEach(() => {
    vi.stubEnv('EASEBUZZ_KEY', 'test-key');
    vi.stubEnv('EASEBUZZ_SALT', 'test-salt');
    vi.stubEnv('EASEBUZZ_ENV', 'test');
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('signs the documented request sequence and returns a trusted sandbox checkout URL', async () => {
    const accessKey = 'a'.repeat(64);
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 1, data: accessKey })));
    vi.stubGlobal('fetch', request);
    expect(await initiatePayment(payment)).toMatchObject({ paymentUrl: `https://testpay.easebuzz.in/pay/${accessKey}` });
    const [url, options] = request.mock.calls[0]!;
    expect(url).toBe('https://testpay.easebuzz.in/payment/initiateLink');
    const body = new URLSearchParams(options.body);
    const fields = ['test-key', payment.txnid, payment.amount, payment.productinfo, payment.firstname, payment.email,
      payment.udf1, payment.udf2, payment.udf3, payment.udf4, payment.udf5, '', '', '', '', '', 'test-salt'];
    expect(body.get('hash')).toBe(crypto.createHash('sha512').update(fields.join('|')).digest('hex'));
    expect(body.get('salt')).toBeNull();
  });

  it('uses the production host only when explicitly configured', async () => {
    vi.stubEnv('EASEBUZZ_ENV', 'production');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 1, data: 'b'.repeat(64) }))));
    expect((await initiatePayment(payment)).paymentUrl).toContain('https://pay.easebuzz.in/pay/');
  });

  it('rejects invalid access keys and reports gateway failures safely', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 1, data: 'https://evil.example' }))));
    expect((await initiatePayment(payment)).error).toBeTruthy();
  });

  it('rejects missing configuration before contacting the gateway', async () => {
    vi.stubEnv('EASEBUZZ_SALT', '');
    const request = vi.fn();
    vi.stubGlobal('fetch', request);
    expect((await initiatePayment(payment)).error).toContain('not configured');
    expect(request).not.toHaveBeenCalled();
  });

  it('validates the reverse sequence with all ten UDFs and rejects tampering', () => {
    const fields = ['test-salt', 'success', '', '', '', '', '', payment.udf5, payment.udf4, payment.udf3,
      payment.udf2, payment.udf1, payment.email, payment.firstname, payment.productinfo, payment.amount, payment.txnid, 'test-key'];
    const response = { ...payment, key: 'test-key', status: 'success', hash: crypto.createHash('sha512').update(fields.join('|')).digest('hex') };
    expect(verifyPaymentHash(response)).toBe(true);
    expect(verifyPaymentHash({ ...response, amount: '5000.00' })).toBe(false);
    expect(verifyPaymentHash({ ...response, key: 'another-key' })).toBe(false);
    expect(verifyPaymentHash({ ...response, hash: 'not-a-hash' })).toBe(false);
    vi.stubEnv('EASEBUZZ_SALT', '');
    expect(verifyPaymentHash(response)).toBe(false);
  });
});
