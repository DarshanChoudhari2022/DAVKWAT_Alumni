import crypto from 'node:crypto';
import { getEasebuzzConfig } from './config';

export interface InitiateParams {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}

export async function initiatePayment(params: InitiateParams): Promise<{
  accessKey?: string; paymentUrl?: string; error?: string;
}> {
  try {
    const { key, salt, baseUrl } = getEasebuzzConfig();
    const hashString = [key, params.txnid, params.amount, params.productinfo, params.firstname, params.email,
      params.udf1 ?? '', params.udf2 ?? '', params.udf3 ?? '', params.udf4 ?? '', params.udf5 ?? '',
      '', '', '', '', '', salt].join('|');
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');
    const body = new URLSearchParams({ key, hash, ...params });
    const res = await fetch(`${baseUrl}/payment/initiateLink`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(), cache: 'no-store', signal: AbortSignal.timeout(20_000),
    });
    const data: { status?: number | string; data?: unknown } = await res.json();
    if (res.ok && Number(data.status) === 1 && typeof data.data === 'string' && /^[a-f0-9]{64}$/i.test(data.data)) {
      return { accessKey: data.data, paymentUrl: `${baseUrl}/pay/${data.data}` };
    }
    return { error: 'Easebuzz could not start checkout. Please try again or contact the Trust.' };
  } catch (error) {
    // Never return raw gateway payloads, hashes, or credentials to the browser.
    return { error: error instanceof Error && error.message.includes('not configured')
      ? error.message : 'Payment service is unavailable. Please try again shortly.' };
  }
}
