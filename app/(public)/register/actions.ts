'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  accountSchema,
  academicSchema,
  personalSchema,
  professionalSchema,
} from '@/lib/validations/registration';
import { APP_URL } from '@/lib/resend/client';

// Use .and() instead of .innerType().merge() to preserve the
// .refine() that checks password === confirmPassword.
const fullSchema = accountSchema.and(
  academicSchema.merge(personalSchema).merge(professionalSchema)
);

export interface RegisterState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  // Coerce types
  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  if (raw.batch_year) raw.batch_year = Number(raw.batch_year);
  raw.hide_email = formData.get('hide_email') === 'on';
  raw.hide_phone = formData.get('hide_phone') === 'on';
  raw.terms_accepted = formData.get('terms_accepted') === 'on';

  // gender: empty string → undefined so zod .optional() works
  if (raw.gender === '') delete raw.gender;
  // date_of_birth: empty string → undefined
  if (raw.date_of_birth === '') delete raw.date_of_birth;

  const parsed = fullSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString();
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors };
  }

  const data = parsed.data;
  const supabase = await createClient();

  // 1. Create auth user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${APP_URL}/auth/callback`,
      data: { full_name: data.full_name },
    },
  });

  if (signUpError) {
    if (signUpError.message?.toLowerCase().includes('already')) {
      return { error: 'An account with this email already exists. Please log in instead.' };
    }
    return { error: signUpError.message || 'An error occurred during registration.' };
  }

  const userId = signUpData.user?.id;
  if (!userId) {
    return { error: 'Could not create account. Please try again.' };
  }

  // 2. Insert profile via service role (bypass RLS for the initial insert)
  try {
    const admin = createAdminClient();
    const { error: profileError } = await admin.from('profiles').insert({
      id: userId,
      email: data.email,
      full_name: data.full_name,
      batch_year: data.batch_year,
      course: data.course,
      roll_number: data.roll_number || null,
      phone: data.phone || null,
      current_city: data.current_city || null,
      current_state: data.current_state || null,
      current_country: data.current_country || 'India',
      date_of_birth: data.date_of_birth || null,
      gender: data.gender || null,
      occupation: data.occupation || null,
      company: data.company || null,
      job_title: data.job_title || null,
      industry: data.industry || null,
      linkedin_url: data.linkedin_url || null,
      bio: data.bio || null,
      hide_email: data.hide_email,
      hide_phone: data.hide_phone,
      role: 'pending',
      approval_status: 'pending',
    });

    if (profileError) {
      console.error('[register] profile insert error:', profileError);
      // Roll back the auth user so the email isn't taken
      try { await admin.auth.admin.deleteUser(userId); } catch {}
      return { error: 'Failed to create your profile. Please try again.' };
    }
  } catch (adminError: unknown) {
    console.error('[register] admin client error:', adminError);
    // Can't roll back auth user here — admin client itself failed.
    // The orphaned auth user won't have a profile, so login will fail gracefully.
    const msg = adminError instanceof Error ? adminError.message : 'Server configuration error';
    return { error: msg };
  }

  // 3. Send emails (non-blocking — don't crash if Resend fails)
  try {
    const { getResend, FROM_EMAIL, ADMIN_EMAIL } = await import('@/lib/resend/client');
    const WelcomeEmail = (await import('@/emails/WelcomeEmail')).default;
    const AdminNotificationEmail = (await import('@/emails/AdminNotificationEmail')).default;

    const resend = getResend();
    await Promise.allSettled([
      resend.emails.send({
        from: FROM_EMAIL,
        to: data.email,
        subject: 'Welcome to DAVKAWT — Registration Received',
        react: WelcomeEmail({
          name: data.full_name,
          batchYear: data.batch_year,
          course: data.course,
        }),
      }),
      resend.emails.send({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `New Registration: ${data.full_name} (Batch ${data.batch_year})`,
        react: AdminNotificationEmail({
          alumniName: data.full_name,
          batchYear: data.batch_year,
          course: data.course,
          email: data.email,
          approvalsUrl: `${APP_URL}/admin/approvals`,
        }),
      }),
    ]);
  } catch (e) {
    console.error('[register] email send failed', e);
    // Registration still succeeded — emails are non-critical
  }

  redirect('/pending-approval');
}
