'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  alumniAcademicSchema,
  personalSchema,
  professionalSchema,
} from '@/lib/validations/registration';
import { APP_URL } from '@/lib/resend/client';
import { getCleanMimeType, isValidImage } from '@/lib/utils/image-validation';

const completeSchema = alumniAcademicSchema.and(personalSchema).and(professionalSchema);
type ProfileType = 'alumni' | 'faculty';
type EducationLevel = 'left_before_10th' | 'secondary' | 'senior_secondary';
type EducationStream = 'Science' | 'Commerce' | 'Arts';

export interface CompleteState {
  error?: string;
  fieldErrors?: Record<string, string>;
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
      console.log(`[register/complete/upload] creating bucket "${bucketName}"`);
      await admin.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 5 * 1024 * 1024,
      });
    }
  } catch (e) {
    console.warn('[register/complete/upload] bucket check/creation warning:', e);
  }

  const fileExt = photoFile.name.split('.').pop() || 'jpg';
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `profile-photos/${fileName}`;

  const cleanMimeType = getCleanMimeType(photoFile);

  const { error: uploadError } = await admin.storage
    .from(bucketName)
    .upload(filePath, photoFile, {
      contentType: cleanMimeType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload photo: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = admin.storage.from(bucketName).getPublicUrl(filePath);
  return publicUrl;
}

async function insertProfile(
  userId: string,
  email: string,
  data: Record<string, unknown>,
  avatarUrl: string | null,
  attempt = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('profiles').insert({
      id: userId,
      email: email,
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

    console.log(`[register/complete] profile created successfully for user ${userId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error inserting profile';
    console.error(`[register/complete] profile insert error (attempt ${attempt}):`, msg);

    if (attempt === 1 && msg.includes('connect')) {
      console.log('[register/complete] retrying profile insert...');
      return insertProfile(userId, email, data, avatarUrl, 2);
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

  // ---------- 3. Check profile photo ----------
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
  if (!isValidImage(photoFile)) {
    return {
      fieldErrors: {
        profile_photo: 'Only JPG, PNG or WebP images are allowed',
      },
    };
  }

  // ---------- 4. Parse & validate ----------
  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  if (raw.passing_year) raw.passing_year = Number(raw.passing_year);
  if (raw.passing_year_10th) raw.passing_year_10th = Number(raw.passing_year_10th);
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

  // ---------- 5. Upload profile photo ----------
  let avatarUrl: string | null = null;
  try {
    avatarUrl = await uploadProfilePhoto(user.id, photoFile);
    console.log(`[register/complete] profile photo uploaded successfully: ${avatarUrl}`);
  } catch (uploadErr: unknown) {
    console.error('[register/complete] profile photo upload failed:', uploadErr);
    const uploadMsg = uploadErr instanceof Error ? uploadErr.message : 'Unknown error';
    return { error: `Failed to upload profile photo: ${uploadMsg}. Please try again.` };
  }

  // ---------- 6. Insert Profile ----------
  const profileResult = await insertProfile(user.id, userEmail, data, avatarUrl);

  if (!profileResult.success) {
    return { error: `Failed to save your profile: ${profileResult.error}. Please try again.` };
  }

  // ---------- 7. Send emails (non-blocking) ----------
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
