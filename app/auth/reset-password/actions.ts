'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { VALIDATION_LIMITS } from '@/lib/validations/constraints';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(VALIDATION_LIMITS.passwordMax)
      .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
      .regex(/[a-z]/, 'Password must contain a lowercase letter.')
      .regex(/[0-9]/, 'Password must contain a number.'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export interface ResetPasswordState {
  error?: string;
  success?: boolean;
  fieldErrors?: Partial<Record<'password' | 'confirmPassword', string>>;
}

export async function resetPasswordAction(
  _previous: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        password: fields.password?.[0],
        confirmPassword: fields.confirmPassword?.[0],
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    const message = error.message.toLowerCase();
    const isMissingSession = message.includes('session') || message.includes('jwt');
    return {
      error: isMissingSession
        ? 'This reset session has expired. Please request a new reset link.'
        : error.message,
    };
  }

  await supabase.auth.signOut();
  return { success: true };
}
