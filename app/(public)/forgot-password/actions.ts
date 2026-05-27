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
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${APP_URL}/auth/reset-password`,
  });

  // Always show success to avoid email enumeration
  if (error) console.error('[forgot-password]', error);
  return { success: true };
}
