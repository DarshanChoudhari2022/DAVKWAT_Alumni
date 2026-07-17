'use server';

import { createClient } from '@/lib/supabase/server';
import { forgotPasswordSchema } from '@/lib/validations/registration';
import { APP_URL } from '@/lib/resend/client';

export interface ForgotState {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
}

export async function forgotPasswordAction(
  _prev: ForgotState,
  formData: FormData
): Promise<ForgotState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { fieldErrors: { email: parsed.error.issues[0]?.message ?? 'Invalid email' } };
  }

  const supabase = await createClient();
  // Build the reset link from the configured APP_URL rather than request headers.
  // Trusting x-forwarded-host would let a spoofed Host header redirect reset
  // links to an attacker-controlled origin (host-header poisoning). Route through
  // /auth/callback so Supabase exchanges the recovery code and sets cookies
  // before the user reaches the password form.
  const callbackUrl = new URL('/auth/callback', APP_URL);
  callbackUrl.searchParams.set('redirect', '/auth/reset-password');

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl.toString(),
  });

  // Always show success to avoid email enumeration
  if (error) console.error('[forgot-password]', error);
  return { success: true };
}
