import crypto from 'crypto';

const EASEBUZZ_KEY = process.env.EASEBUZZ_KEY!;
const EASEBUZZ_SALT = process.env.EASEBUZZ_SALT!;
const EASEBUZZ_ENV = process.env.EASEBUZZ_ENV ?? 'test';

const BASE_URL =
  EASEBUZZ_ENV === 'production'
    ? 'https://pay.easebuzz.in'
    : 'https://testpay.easebuzz.in';

interface InitiateParams {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone?: string;
  surl: string;
  furl: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}

function generateHash(params: InitiateParams): string {
  const hashString = [
    EASEBUZZ_KEY,
    params.txnid,
    params.amount,
    params.productinfo,
    params.firstname,
    params.email,
    params.udf1 ?? '',
    params.udf2 ?? '',
    params.udf3 ?? '',
    params.udf4 ?? '',
    params.udf5 ?? '',
    '', '', '', '', '',
    EASEBUZZ_SALT,
  ].join('|');

  return crypto.createHash('sha512').update(hashString).digest('hex');
}

export async function initiatePayment(params: InitiateParams): Promise<{
  accessKey?: string;
  paymentUrl?: string;
  error?: string;
}> {
  const hash = generateHash(params);

  const body = new URLSearchParams({
    key: EASEBUZZ_KEY,
    txnid: params.txnid,
    amount: params.amount,
    productinfo: params.productinfo,
    firstname: params.firstname,
    email: params.email,
    phone: params.phone ?? '',
    surl: params.surl,
    furl: params.furl,
    hash,
    udf1: params.udf1 ?? '',
    udf2: params.udf2 ?? '',
    udf3: params.udf3 ?? '',
    udf4: params.udf4 ?? '',
    udf5: params.udf5 ?? '',
  });

  const res = await fetch(`${BASE_URL}/payment/initiateLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json();

  if (data.status === 1 && data.data) {
    return {
      accessKey: data.data,
      paymentUrl: `${BASE_URL}/pay/${data.data}`,
    };
  }

  return { error: data.error_desc ?? data.data ?? 'Payment initiation failed.' };
}

export { EASEBUZZ_KEY, EASEBUZZ_SALT, EASEBUZZ_ENV, BASE_URL };
