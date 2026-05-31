'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';
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

/**
 * Clean up an orphaned auth user (has auth entry but no profile row).
 * An orphan happens when a prior registration created the auth user
 * but failed to create the profile row (e.g. network error, RLS issue).
 */
async function cleanUpOrphanedUser(email: string): Promise<{ cleaned: boolean; error?: string }> {
  try {
    const admin = createAdminClient();

    // First check if a profile with this email already exists (Prisma)
    const existingProfile = await prisma.profiles.findFirst({
      where: { email },
      select: { id: true },
    });

    if (existingProfile) {
      // User has a profile — they're a real user, not an orphan
      return { cleaned: false };
    }

    // No profile found. Check if there's an orphaned auth user with this email.
    const perPage = 200;
    for (let page = 1; page <= 25; page += 1) {
      const { data: authData, error: authError } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (authError) {
        console.error('[register] failed to check for orphaned auth user:', authError);
        return { cleaned: false, error: authError.message };
      }

      const orphan = authData?.users?.find((u) => u.email === email);
      if (orphan) {
        console.log(`[register] cleaning up orphaned auth user: ${orphan.id} (${email})`);
        const { error: deleteError } = await admin.auth.admin.deleteUser(orphan.id);
        if (deleteError) {
          console.error('[register] failed to delete orphaned user:', deleteError);
          return {
            cleaned: false,
            error: `Could not clean up previous registration attempt: ${deleteError.message}`,
          };
        }
        return { cleaned: true };
      }

      if (!authData?.users?.length || authData.users.length < perPage) {
        break;
      }
    }

    return { cleaned: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error during orphan check';
    console.error('[register] orphan cleanup error:', msg);
    return { cleaned: false, error: msg };
  }
}

/**
 * Insert profile row via Prisma (direct DB connection, bypasses RLS).
 * Retries once on transient failure.
 */
async function insertProfile(
  userId: string,
  data: Record<string, unknown>,
  attempt = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.profiles.create({
      data: {
        id: userId,
        email: data.email as string,
        full_name: data.full_name as string,
        batch_year: data.batch_year as number,
        course: data.course as string,
        roll_number: (data.roll_number as string) || null,
        phone: (data.phone as string) || null,
        current_city: (data.current_city as string) || null,
        current_state: (data.current_state as string) || null,
        current_country: (data.current_country as string) || 'India',
        date_of_birth: (data.date_of_birth as string) ? new Date(data.date_of_birth as string) : null,
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
      },
    });

    console.log(`[register] profile created successfully for user ${userId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error inserting profile';
    console.error(`[register] profile insert error (attempt ${attempt}):`, msg);

    // Retry once on transient errors
    if (attempt === 1 && msg.includes('connect')) {
      console.log('[register] retrying profile insert...');
      return insertProfile(userId, data, 2);
    }

    return { success: false, error: msg };
  }
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  // ---------- 1. Parse & validate ----------
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
    console.log('[register] validation failed:', fieldErrors);
    return { fieldErrors };
  }

  const data = parsed.data;
  console.log(`[register] starting registration for ${data.email}`);

  // ---------- 2. Clean up orphaned auth user (if any) ----------
  const orphanResult = await cleanUpOrphanedUser(data.email);
  if (orphanResult.error && !orphanResult.cleaned) {
    console.warn('[register] orphan check warning:', orphanResult.error);
  }

  // ---------- 3. Create auth user ----------
  const supabase = await createClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${APP_URL}/auth/callback`,
      data: { full_name: data.full_name },
    },
  });

  if (signUpError) {
    console.error('[register] signUp error:', {
      message: signUpError.message,
      status: signUpError.status,
    });

    if (signUpError.message?.toLowerCase().includes('already')) {
      return { error: 'An account with this email already exists. Please log in instead.' };
    }
    return { error: signUpError.message || 'An error occurred during registration.' };
  }

  // Detect "fake duplicate": Supabase returns a user with empty identities
  // when email confirmation is enabled and the email is already taken
  const user = signUpData.user;
  if (!user || !user.id) {
    console.error('[register] signUp returned no user object');
    return { error: 'Could not create account. Please try again.' };
  }

  if (user.identities && user.identities.length === 0) {
    console.warn('[register] detected fake-duplicate user (email already registered):', data.email);
    return { error: 'An account with this email already exists. Please log in or check your email for a verification link.' };
  }

  const userId = user.id;
  console.log(`[register] auth user created: ${userId}`);

  // ---------- 4. Insert profile via Prisma (bypasses RLS) ----------
  const profileResult = await insertProfile(userId, data);

  if (!profileResult.success) {
    // Roll back the auth user so the email isn't permanently taken
    console.error('[register] rolling back auth user due to profile insert failure');
    try {
      const admin = createAdminClient();
      await admin.auth.admin.deleteUser(userId);
      console.log('[register] rolled back auth user successfully');
    } catch (rollbackErr) {
      console.error('[register] rollback failed — user may be orphaned:', rollbackErr);
    }
    return { error: `Failed to create your profile: ${profileResult.error}. Please try again.` };
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

    emailResults.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`[register] email ${i} failed:`, result.reason);
      }
    });
  } catch (e) {
    console.error('[register] email module failed:', e);
    // Registration still succeeded — emails are non-critical
  }

  // ---------- 6. Redirect based on email confirmation status ----------
  const emailConfirmed = user.email_confirmed_at != null;

  if (emailConfirmed) {
    console.log('[register] email auto-confirmed, redirecting to pending-approval');
    redirect('/pending-approval');
  } else {
    console.log('[register] email not confirmed, redirecting to verify-email');
    redirect('/verify-email');
  }
}
