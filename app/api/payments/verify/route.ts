import { NextResponse } from 'next/server';
import { processEasebuzzCallback } from '@/lib/payments/callback';
import { resolveAppUrl } from '@/lib/utils/app-url';

// Easebuzz POSTs to both the success and failure URL. Use 303 so the browser
// follows with GET, without replaying payment form data or relying on auth cookies.
export async function POST(req: Request) {
  let path = '/register/payment?error=verification_failed';
  try {
    const form = await req.formData();
    const params: Record<string, string> = {};
    form.forEach((value, key) => { if (typeof value === 'string') params[key] = value; });
    const result = await processEasebuzzCallback(params);
    const target = result.source === 'registration' ? '/register/payment' : '/membership';
    path = `${target}?status=${result.status}`;
  } catch {
    // Do not expose signed callback payloads or internal database errors.
    console.error('[payments/verify] Payment verification could not complete.');
  }
  return NextResponse.redirect(new URL(path, resolveAppUrl()), 303);
}
