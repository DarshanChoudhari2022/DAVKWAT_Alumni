import { NextResponse } from 'next/server';
import { PaymentCallbackError, processEasebuzzCallback } from '@/lib/payments/callback';
import { parseEasebuzzResponse } from '@/lib/easebuzz/parse-response';

export async function POST(req: Request) {
  try {
    const params = await parseEasebuzzResponse(req);
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
