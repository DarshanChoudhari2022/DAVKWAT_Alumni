import { NextResponse } from 'next/server';
import { PaymentCallbackError, processEasebuzzCallback } from '@/lib/payments/callback';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const params: Record<string, string> = {};
    form.forEach((value, key) => { if (typeof value === 'string') params[key] = value; });
    const result = await processEasebuzzCallback(params);
    return NextResponse.json({ status: 'ok', duplicate: result.duplicate });
  } catch (error) {
    if (error instanceof PaymentCallbackError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('[payments/webhook] Payment verification could not complete.');
    // Non-2xx permits gateway retries after a transient DB failure.
    return NextResponse.json({ error: 'Payment processing unavailable.' }, { status: 500 });
  }
}
