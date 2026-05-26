import crypto from 'crypto';
import { EASEBUZZ_SALT } from './initiate';

/**
 * Verify the reverse hash from Easebuzz callback/webhook.
 * Format: sha512(SALT|status||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
export function verifyPaymentHash(params: {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  status: string;
  hash: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}): boolean {
  const reverseHashString = [
    EASEBUZZ_SALT,
    params.status,
    '', // empty
    params.udf5 ?? '',
    params.udf4 ?? '',
    params.udf3 ?? '',
    params.udf2 ?? '',
    params.udf1 ?? '',
    params.email,
    params.firstname,
    params.productinfo,
    params.amount,
    params.txnid,
    params.key,
  ].join('|');

  const computed = crypto.createHash('sha512').update(reverseHashString).digest('hex');
  return computed === params.hash;
}
