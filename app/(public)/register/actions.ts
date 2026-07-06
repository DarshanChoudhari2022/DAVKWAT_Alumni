'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fullRegistrationSchema } from '@/lib/validations/registration';
import { APP_URL } from '@/lib/resend/client';

const fullSchema = fullRegistrationSchema;
type ProfileType = 'alumni' | 'faculty';
type EducationLevel = 'left_before_10th' | 'secondary' | 'senior_secondary';
type EducationStream = 'Science' | 'Commerce' | 'Arts';

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

    const { data: existingProfile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (profileError) {
      console.error('[register] failed to check for existing profile:', profileError);
      return { cleaned: false, error: profileError.message };
    }

    if (existingProfile) {
      // User has a profile, so this is not an orphaned auth account.
      return { cleaned: false };
    }

    const perPage = 1000;
    for (let page = 1; page <= 20; page += 1) {
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
 * Upload profile photo to Supabase storage 'avatars' bucket.
 * Creates the bucket if it does not exist.
 */
async function uploadProfilePhoto(userId: string, photoFile: File): Promise<string> {
  const admin = createAdminClient();
  const bucketName = 'avatars';

  // Ensure bucket exists
  try {
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.find((b) => b.name === bucketName)) {
      console.log(`[register/upload] creating bucket "${bucketName}"`);
      await admin.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 5 * 1024 * 1024,
      });
    }
  } catch (e) {
    console.warn('[register/upload] bucket check/creation warning:', e);
  }

  const fileExt = photoFile.name.split('.').pop() || 'jpg';
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `profile-photos/${fileName}`;

  const { error: uploadError } = await admin.storage
    .from(bucketName)
    .upload(filePath, photoFile, {
      contentType: photoFile.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload photo: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = admin.storage.from(bucketName).getPublicUrl(filePath);
  return publicUrl;
}

/**
 * Insert profile row via service-role Supabase client (bypasses RLS).
 * Retries once on transient failure.
 */
async function insertProfile(
  userId: string,
  data: Record<string, unknown>,
  avatarUrl: string | null,
  attempt = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('profiles').insert({
      id: userId,
      email: data.email as string,
      profile_type: ((data.profile_type as ProfileType | undefined) ?? 'alumni'),
      full_name: data.full_name as string,
      batch_year: data.batch_year as number,
      course: data.course as string,
      education_level: (data.education_level as EducationLevel | undefined) ?? null,
      education_stream: (data.education_stream as EducationStream | '' | undefined) || null,
      passing_year: (data.passing_year as number) || (data.batch_year as number),
      passing_year_10th: (data.passing_year_10th as number) || null,
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
      avatar_url: avatarUrl,
      role: 'pending',
      approval_status: 'pending',
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log(`[register] profile created successfully for user ${userId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error inserting profile';
    console.error(`[register] profile insert error (attempt ${attempt}):`, msg);

    // Retry once on transient errors
    if (attempt === 1 && msg.includes('connect')) {
      console.log('[register] retrying profile insert...');
      return insertProfile(userId, data, avatarUrl, 2);
    }

    return { success: false, error: msg };
  }
}

async function signUpUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
  password: string,
  fullName: string
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${APP_URL}/auth/callback`,
      data: { full_name: fullName },
    },
  });
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  // ---------- 1. Check profile photo file first ----------
  const photoFile = formData.get('profile_photo') as File | null;
  if (!photoFile || photoFile.size === 0) {
    return {
      fieldErrors: {
        profile_photo: 'Profile photo is required',
      },
    };
  }
  if (photoFile.size > 5 * 1024 * 1024) {
    return {
      fieldErrors: {
        profile_photo: 'Photo must be under 5 MB',
      },
    };
  }
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(photoFile.type)) {
    return {
      fieldErrors: {
        profile_photo: 'Only JPG, PNG or WebP images are allowed',
      },
    };
  }

  // ---------- 2. Parse & validate fields ----------
  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  if (raw.passing_year) raw.passing_year = Number(raw.passing_year);
  if (raw.passing_year_10th) raw.passing_year_10th = Number(raw.passing_year_10th);
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

  // ---------- 3. Create auth user ----------
  const supabase = await createClient();
  let signUpResult = await signUpUser(supabase, data.email, data.password, data.full_name);

  if (signUpResult.error?.message?.toLowerCase().includes('already')) {
    const orphanResult = await cleanUpOrphanedUser(data.email);

    if (orphanResult.cleaned) {
      signUpResult = await signUpUser(supabase, data.email, data.password, data.full_name);
    } else {
      if (orphanResult.error) {
        console.warn('[register] orphan cleanup warning:', orphanResult.error);
      }
      return { error: 'An account with this email already exists. Please log in instead.' };
    }
  }

  const { data: signUpData, error: signUpError } = signUpResult;

  if (signUpError) {
    console.error('[register] signUp error:', {
      message: signUpError.message,
      status: signUpError.status,
    });

    return { error: signUpError.message || 'An error occurred during registration.' };
  }

  // Detect "fake duplicate": Supabase returns a user with empty identities
  // when email confirmation is enabled and the email is already taken
  let currentUser = signUpData.user;
  if (!currentUser || !currentUser.id) {
    console.error('[register] signUp returned no user object');
    return { error: 'Could not create account. Please try again.' };
  }

  if (currentUser.identities && currentUser.identities.length === 0) {
    const orphanResult = await cleanUpOrphanedUser(data.email);

    if (orphanResult.cleaned) {
      const retryResult = await signUpUser(supabase, data.email, data.password, data.full_name);
      if (retryResult.error || !retryResult.data.user?.id) {
        console.error('[register] retry after orphan cleanup failed:', retryResult.error);
        return {
          error:
            'We found an incomplete earlier registration, but could not finish repairing it. Please try again.',
        };
      }

      currentUser = retryResult.data.user;
    } else {
      console.warn('[register] detected duplicate signup for existing account:', data.email);
      return {
        error:
          'An account with this email already exists. Please log in or check your email for a verification link.',
      };
    }
  }

  const userId = currentUser.id;
  console.log(`[register] auth user created: ${userId}`);

  // ---------- 4. Upload profile photo ----------
  let avatarUrl: string | null = null;
  try {
    avatarUrl = await uploadProfilePhoto(userId, photoFile);
    console.log(`[register] profile photo uploaded successfully: ${avatarUrl}`);
  } catch (uploadErr: unknown) {
    console.error('[register] profile photo upload failed:', uploadErr);
    // Roll back auth user
    try {
      const admin = createAdminClient();
      await admin.auth.admin.deleteUser(userId);
    } catch (rollbackErr) {
      console.error('[register] rollback failed:', rollbackErr);
    }
    const uploadMsg = uploadErr instanceof Error ? uploadErr.message : 'Unknown error';
    return { error: `Failed to upload profile photo: ${uploadMsg}. Please try again.` };
  }

  // ---------- 5. Insert profile via service role ----------
  const profileResult = await insertProfile(userId, data, avatarUrl);

  if (!profileResult.success) {
    // Roll back the auth user so the email isn't permanently taken
    console.error('[register] rolling back auth user due to profile insert failure');
    try {
      const admin = createAdminClient();
      await admin.auth.admin.deleteUser(userId);
    } catch (rollbackErr) {
      console.error('[register] rollback failed — user may be orphaned:', rollbackErr);
    }
    return { error: `Failed to create your profile: ${profileResult.error}. Please try again.` };
  }

  // ---------- 6. Send emails (non-blocking) ----------
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

  // ---------- 7. Redirect based on email confirmation status ----------
  const emailConfirmed = currentUser.email_confirmed_at != null;

  if (emailConfirmed) {
    console.log('[register] email auto-confirmed, redirecting to pending-approval');
    redirect('/pending-approval');
  } else {
    console.log('[register] email not confirmed, redirecting to verify-email');
    redirect('/verify-email');
  }
}
