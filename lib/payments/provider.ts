/** Covers both current checkout metadata and older Easebuzz payment records. */
export function isEasebuzzPayment(payment: {
  gateway_response?: unknown;
  easebuzz_payment_id?: string | null;
  payment_mode?: string | null;
}): boolean {
  const metadata = payment.gateway_response;
  return !!payment.easebuzz_payment_id || payment.payment_mode?.toLowerCase() === 'easebuzz'
    || (!!metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      && 'provider' in metadata && metadata.provider === 'easebuzz');
}
