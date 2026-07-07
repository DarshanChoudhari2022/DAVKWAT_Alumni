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
 * Upload school document to Supabase storage 'school-documents' bucket.
 * Creates the bucket if it does not exist.
 */
async function uploadSchoolDocument(userId: string, docFile: File): Promise<string> {
  const admin = createAdminClient();
  const bucketName = 'school-documents';

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
    console.warn('[register/upload] school-documents bucket check/creation warning:', e);
  }

  const fileExt = docFile.name.split('.').pop() || 'jpg';
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `documents/${fileName}`;

  const { error: uploadError } = await admin.storage
    .from(bucketName)
    .upload(filePath, docFile, {
      contentType: docFile.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload school document: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = admin.storage.from(bucketName).getPublicUrl(filePath);
  return publicUrl;
}

/**
 * Upload payment proof screenshot to Supabase storage 'payment-proofs' bucket.
 * Creates the bucket if it does not exist.
 */
async function uploadPaymentProof(userId: string, proofFile: File): Promise<string> {
  const admin = createAdminClient();
  const bucketName = 'payment-proofs';

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
    console.warn('[register/upload] payment-proofs bucket check/creation warning:', e);
  }

  const fileExt = proofFile.name.split('.').pop() || 'jpg';
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `proofs/${fileName}`;

  const { error: uploadError } = await admin.storage
    .from(bucketName)
    .upload(filePath, proofFile, {
      contentType: proofFile.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload payment proof: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = admin.storage.from(bucketName).getPublicUrl(filePath);
  return publicUrl;
}

/**
 * Create a manual pending payment record.
 * Storing the screenshot URL in receipt_url to work with the existing schema.
 */
async function createManualPayment(
  userId: string,
  amount: number,
  proofUrl: string
): Promise<string> {
  const admin = createAdminClient();
  const txnid = `TXN-MAN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const { error } = await admin.from('payments').insert({
    alumni_id: userId,
    txnid,
    amount,
    currency: 'INR',
    status: 'pending',
    payment_mode: 'UPI_QR',
    receipt_url: proofUrl,
  });

  if (error) {
    throw new Error(`Failed to create payment record: ${error.message}`);
  }

  return txnid;
}

/**
 * Insert profile row via service-role Supabase client (bypasses RLS).
 * Retries once on transient failure.
 */
async function insertProfile(
  userId: string,
  data: Record<string, unknown>,
  avatarUrl: string | null,
  schoolDocUrl: string | null,
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
      website_url: schoolDocUrl, // Storing school document URL in website_url
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
      return insertProfile(userId, data, avatarUrl, schoolDocUrl, 2);
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

  // ---------- 1b. Check proof of schooling file first ----------
  const schoolDocFile = formData.get('school_document') as File | null;
  if (!schoolDocFile || schoolDocFile.size === 0) {
    return {
      fieldErrors: {
        school_document: 'Proof of schooling is required',
      },
    };
  }
  if (schoolDocFile.size > 10 * 1024 * 1024) {
    return {
      fieldErrors: {
        school_document: 'School document must be under 10 MB',
      },
    };
  }
  if (!allowedTypes.includes(schoolDocFile.type)) {
    return {
      fieldErrors: {
        school_document: 'Only JPG, PNG or WebP images are allowed',
      },
    };
  }

  // ---------- 1c. Check proof of payment file first ----------
  const paymentProofFile = formData.get('payment_proof') as File | null;
  if (!paymentProofFile || paymentProofFile.size === 0) {
    return {
      fieldErrors: {
        payment_proof: 'Proof of payment is required',
      },
    };
  }
  if (paymentProofFile.size > 10 * 1024 * 1024) {
    return {
      fieldErrors: {
        payment_proof: 'Payment proof must be under 10 MB',
      },
    };
  }
  if (!allowedTypes.includes(paymentProofFile.type)) {
    return {
      fieldErrors: {
        payment_proof: 'Only JPG, PNG or WebP images are allowed',
      },
    };
  }

  // ---------- 2. Parse & validate fields ----------
  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  if (raw.passing_year) raw.passing_year = Number(raw.passing_year);
  if (raw.passing_year_10th) raw.passing_year_10th = Number(raw.passing_year_10th);
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
    try {
      const admin = createAdminClient();
      await admin.auth.admin.deleteUser(userId);
    } catch (rollbackErr) {
      console.error('[register] rollback failed:', rollbackErr);
    }
    const uploadMsg = uploadErr instanceof Error ? uploadErr.message : 'Unknown error';
    return { error: `Failed to upload profile photo: ${uploadMsg}. Please try again.` };
  }

  // ---------- 4b. Upload proof of schooling (compulsory) ----------
  let schoolDocUrl: string | null = null;
  if (schoolDocFile && schoolDocFile.size > 0) {
    try {
      schoolDocUrl = await uploadSchoolDocument(userId, schoolDocFile);
      console.log(`[register] proof of schooling uploaded: ${schoolDocUrl}`);
    } catch (docErr: unknown) {
      console.error('[register] proof of schooling upload failed:', docErr);
      // Non-fatal — continue registration
    }
  }

  // ---------- 5. Insert profile via service role ----------
  const profileResult = await insertProfile(userId, data, avatarUrl, schoolDocUrl);

  if (!profileResult.success) {
    console.error('[register] rolling back auth user due to profile insert failure');
    try {
      const admin = createAdminClient();
      await admin.auth.admin.deleteUser(userId);
    } catch (rollbackErr) {
      console.error('[register] rollback failed — user may be orphaned:', rollbackErr);
    }
    return { error: `Failed to create your profile: ${profileResult.error}. Please try again.` };
  }

  // ---------- 5b. Upload proof of payment & create payment record ----------
  const selectedAmount = Number(formData.get('selected_amount') || 500);
  if (paymentProofFile && paymentProofFile.size > 0) {
    try {
      const proofUrl = await uploadPaymentProof(userId, paymentProofFile);
      console.log(`[register] proof of payment uploaded: ${proofUrl}`);
      const txnid = await createManualPayment(userId, selectedAmount, proofUrl);
      console.log(`[register] manual payment created: ${txnid}`);

      // Send WhatsApp-style proof link via the admin email too
      try {
        const { buildManualPaymentWhatsappUrl } = await import('@/lib/payments/manual-upi');
        const whatsappUrl = buildManualPaymentWhatsappUrl({
          fullName: data.full_name,
          batchYear: String(data.batch_year),
          amount: selectedAmount as 500 | 5000,
          paymentProofUrl: proofUrl,
        });
        console.log(`[register] WhatsApp proof URL generated: ${whatsappUrl}`);
      } catch {
        // Non-critical
      }
    } catch (payErr: unknown) {
      console.error('[register] proof of payment upload/record failed:', payErr);
      // Non-fatal — registration still succeeded
    }
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
    redirect('/pending-approval?registered=true');
  } else {
    console.log('[register] email not confirmed, redirecting to verify-email');
    redirect('/verify-email?registered=true');
  }
}

/**
 * Check if an email is already registered in the profiles table.
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    console.error('[register] checkEmailExists error:', error);
    return false;
  }
  return !!data;
}
