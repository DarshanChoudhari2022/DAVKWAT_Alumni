import crypto from 'node:crypto';
import { getEasebuzzConfig } from './config';
import { verifyPaymentHash } from './verify';

/** Read-only merchant API. Never initiate another charge to discover payment status. */
export async function retrievePayment(txnid: string): Promise<Record<string, string>> {
  const { key, salt, environment } = getEasebuzzConfig();
  const host = environment === 'production' ? 'https://dashboard.easebuzz.in' : 'https://testdashboard.easebuzz.in';
  const hash = crypto.createHash('sha512').update([key, txnid, salt].join('|')).digest('hex');
  const response = await fetch(`${host}/transaction/v2/retrieve`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ key, txnid, hash }).toString(), cache: 'no-store', signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error('Gateway lookup unavailable');
  const body = await response.json();
  // The official live API returns {status:true,msg:{...transaction}}.
  const raw = body?.msg ?? body?.data;
  if (![true, 1, '1'].includes(body?.status) || !raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Gateway has not returned a verifiable transaction');
  }
  const params: Record<string, string> = {};
  for (const [field, value] of Object.entries(raw)) {
    if (typeof value === 'string' || typeof value === 'number') params[field] = String(value);
  }
  if (params.txnid !== txnid || !verifyPaymentHash(params)) throw new Error('Gateway transaction could not be authenticated');
  return params;
}
