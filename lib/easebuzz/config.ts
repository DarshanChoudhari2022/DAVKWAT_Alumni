export function getEasebuzzConfig() {
  const key = process.env.EASEBUZZ_KEY?.trim();
  const salt = process.env.EASEBUZZ_SALT?.trim();
  const environment = process.env.EASEBUZZ_ENV?.trim() || 'test';
  if (!key || !salt) throw new Error('Easebuzz is not configured. Set EASEBUZZ_KEY and EASEBUZZ_SALT on the server.');
  if (!['test', 'production'].includes(environment)) throw new Error('EASEBUZZ_ENV must be test or production.');
  return {
    key, salt, environment,
    baseUrl: environment === 'production' ? 'https://pay.easebuzz.in' : 'https://testpay.easebuzz.in',
  };
}
