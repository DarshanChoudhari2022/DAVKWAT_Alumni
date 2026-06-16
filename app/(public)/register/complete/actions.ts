'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  academicSchema,
  personalSchema,
  professionalSchema,
} from '@/lib/validations/registration';
import { APP_URL } from '@/lib/resend/client';

const completeSchema = academicSchema.merge(personalSchema).merge(professionalSchema);

export interface CompleteState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function insertProfile(
  userId: string,
  email: string,
  data: Record<string, unknown>,
  attempt = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('profiles').insert({
      id: userId,
      email: email,
      full_name: data.full_name as string,
      batch_year: data.batch_year as number,
      course: data.course as string,
      roll_number: (data.roll_number as string) || null,
      phone: (data.phone as string) || null,
      current_city: (data.current_city as string) || null,
      current_state: (data.current_state as string) || null,
      current_country: (data.current_country as string) || 'India',
      date_of_birth: (data.date_of_birth as string) || null,
      gender: (data.gender as string) || null,
      occupation: (data.occupation as string) || null,
      company: (data.company as string) || null,
      job_title: (data.job_title as string) || null,
      industry: (data.industry as string) || null,
      linkedin_url: (data.linkedin_url as string) || null,
      bio: (data.bio as string) || null,
      hide_email: data.hide_email as boolean,
      hide_phone: data.hide_phone as boolean,
      role: 'pending',
      approval_status: 'pending',
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log(`[register/complete] profile created successfully for user ${userId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error inserting profile';
    console.error(`[register/complete] profile insert error (attempt ${attempt}):`, msg);

    if (attempt === 1 && msg.includes('connect')) {
      console.log('[register/complete] retrying profile insert...');
      return insertProfile(userId, email, data, 2);
    }

    return { success: false, error: msg };
  }
}

export async function completeRegistrationAction(
  _prev: CompleteState,
  formData: FormData
): Promise<CompleteState> {
  // ---------- 1. Check Auth Session ----------
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('[register/complete] auth error:', authError);
    return { error: 'You must be signed in to complete registration.' };
  }

  // ---------- 2. Check If Profile Already Exists ----------
  const admin = createAdminClient();
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfile) {
    redirect('/dashboard');
  }

  // ---------- 3. Parse & validate ----------
  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  if (raw.batch_year) raw.batch_year = Number(raw.batch_year);
  raw.hide_email = formData.get('hide_email') === 'on';
  raw.hide_phone = formData.get('hide_phone') === 'on';
  raw.terms_accepted = formData.get('terms_accepted') === 'on';

  if (raw.gender === '') delete raw.gender;
  if (raw.date_of_birth === '') delete raw.date_of_birth;

  const parsed = completeSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString();
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    console.log('[register/complete] validation failed:', fieldErrors);
    return { fieldErrors };
  }

  const data = parsed.data;
  const userEmail = user.email!;

  // ---------- 4. Insert Profile ----------
  const profileResult = await insertProfile(user.id, userEmail, data);

  if (!profileResult.success) {
    return { error: `Failed to save your profile: ${profileResult.error}. Please try again.` };
  }

  // ---------- 5. Send emails (non-blocking) ----------
  try {
    const { getResend, FROM_EMAIL, ADMIN_EMAIL } = await import('@/lib/resend/client');
    const WelcomeEmail = (await import('@/emails/WelcomeEmail')).default;
    const AdminNotificationEmail = (await import('@/emails/AdminNotificationEmail')).default;

    const resend = getResend();
    const emailResults = await Promise.allSettled([
      resend.emails.send({
        from: FROM_EMAIL,
        to: userEmail,
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
        subject: `New Registration (OAuth): ${data.full_name} (Batch ${data.batch_year})`,
        react: AdminNotificationEmail({
          alumniName: data.full_name,
          batchYear: data.batch_year,
          course: data.course,
          email: userEmail,
          approvalsUrl: `${APP_URL}/admin/approvals`,
        }),
      }),
    ]);

    emailResults.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`[register/complete] email ${i} failed:`, result.reason);
      }
    });
  } catch (e) {
    console.error('[register/complete] email module failed:', e);
  }

  redirect('/pending-approval');
}
