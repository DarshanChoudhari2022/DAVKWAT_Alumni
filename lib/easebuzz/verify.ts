import crypto from 'node:crypto';
import { getEasebuzzConfig } from './config';

export function verifyPaymentHash(params: Record<string, string | undefined>): boolean {
  try {
    const { key, salt } = getEasebuzzConfig();
    if (params.key !== key || !params.hash || !/^[a-f0-9]{128}$/i.test(params.hash)) return false;
    // Official reverse sequence: SALT|status|udf10|...|udf1|email|firstname|productinfo|amount|txnid|key.
    const fields = [salt, params.status ?? '',
      ...Array.from({ length: 10 }, (_, index) => params[`udf${10 - index}`] ?? ''),
      params.email ?? '', params.firstname ?? '', params.productinfo ?? '', params.amount ?? '', params.txnid ?? '', key];
    const computed = crypto.createHash('sha512').update(fields.join('|')).digest();
    return crypto.timingSafeEqual(computed, Buffer.from(params.hash, 'hex'));
  } catch {
    return false;
  }
}
