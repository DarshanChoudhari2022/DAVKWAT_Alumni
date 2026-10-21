// Explicit opt-in only: creates one uncharged sandbox checkout using local .env.local.
import { loadEnvConfig } from '@next/env';
import { expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { initiatePayment } from './initiate';

const enabled = process.env.EASEBUZZ_SANDBOX_SMOKE === '1';
if (enabled) {
  // Next intentionally skips .env.local under NODE_ENV=test; this opt-in smoke
  // uses the same local config as next dev, then restores the test environment.
  const previous = process.env.NODE_ENV;
  vi.stubEnv('NODE_ENV', 'development');
  loadEnvConfig(process.cwd(), true);
  vi.stubEnv('NODE_ENV', previous);
}

it.skipIf(!enabled).each(['500.00', '5000.00'])('creates an uncharged sandbox checkout for INR %s', async (amount) => {
  expect(process.env.EASEBUZZ_ENV).toBe('test');
  const result = await initiatePayment({
    txnid: `SMOKE${randomUUID().replace(/-/g, '')}`, amount,
    productinfo: amount === '500.00' ? 'DAVKAWT Annual Membership' : 'DAVKAWT Lifetime Membership', firstname: 'Test Member',
    email: 'integration-test@example.com', phone: '9876543210',
    surl: 'https://davkawt.org/api/payments/verify', furl: 'https://davkawt.org/api/payments/verify',
  });
  expect(result.error).toBeUndefined();
  expect(result.paymentUrl).toMatch(/^https:\/\/testpay\.easebuzz\.in\/pay\/[a-f0-9]{64}$/i);
}, 30_000);
