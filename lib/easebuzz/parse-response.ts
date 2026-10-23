import { PaymentCallbackError } from '@/lib/payments/callback';

/** Browser returns are form posts; merchant webhooks may be JSON posts. */
export async function parseEasebuzzResponse(request: Request): Promise<Record<string, string>> {
  const params: Record<string, string> = {};
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body: unknown = await request.json();
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid payload');
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string' || typeof value === 'number') params[key] = String(value);
      }
    } else {
      const form = await request.formData();
      form.forEach((value, key) => { if (typeof value === 'string') params[key] = value; });
    }
  } catch {
    throw new PaymentCallbackError('Invalid payment response format.', 400);
  }
  return params;
}
