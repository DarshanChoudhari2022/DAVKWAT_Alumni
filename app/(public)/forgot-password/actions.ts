'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { forgotPasswordSchema } from '@/lib/validations/registration';
import { APP_URL } from '@/lib/resend/client';

export interface ForgotState {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  const proto =
    headerStore.get('x-forwarded-proto') ??
    (host?.startsWith('localhost') || host?.startsWith('127.0.0.1') ? 'http' : 'https');

  if (host) {
    return `${proto}://${host}`;
  }

  return APP_URL;
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
  const callbackUrl = new URL('/auth/callback', await getRequestOrigin());
  callbackUrl.searchParams.set('redirect', '/auth/reset-password');

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl.toString(),
  });

  // Always show success to avoid email enumeration
  if (error) console.error('[forgot-password]', error);
  return { success: true };
}
