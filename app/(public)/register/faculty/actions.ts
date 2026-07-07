'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { facultyRegistrationSchema } from '@/lib/validations/registration';
import { APP_URL } from '@/lib/resend/client';
import { uploadSchoolDocument } from '../actions';


export interface FacultyRegisterState {
  error?: string;
  fieldErrors?: Record<string, string>;
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

async function deleteAuthUser(userId: string) {
  try {
    await createAdminClient().auth.admin.deleteUser(userId);
  } catch (error) {
    console.error('[faculty/register] rollback failed:', error);
  }
}

export async function facultyRegisterAction(
  _prev: FacultyRegisterState,
  formData: FormData
): Promise<FacultyRegisterState> {
  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  if (raw.taught_from_year) raw.taught_from_year = Number(raw.taught_from_year);
  if (raw.taught_to_year) raw.taught_to_year = Number(raw.taught_to_year);
  raw.hide_email = formData.get('hide_email') === 'on';
  raw.hide_phone = formData.get('hide_phone') === 'on';
  raw.terms_accepted = formData.get('terms_accepted') === 'on';
  if (raw.taught_to_year === '') delete raw.taught_to_year;

  const parsed = facultyRegistrationSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  // ---------- Validate document file ----------
  const schoolDocFile = formData.get('school_document') as File | null;
  if (!schoolDocFile || schoolDocFile.size === 0) {
    return {
      fieldErrors: {
        school_document: 'Proof of ID is required',
      },
    };
  }
  if (schoolDocFile.size > 5 * 1024 * 1024) {
    return {
      fieldErrors: {
        school_document: 'Document must be under 5 MB',
      },
    };
  }
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(schoolDocFile.type)) {
    return {
      fieldErrors: {
        school_document: 'Only JPG, PNG or WebP images are allowed',
      },
    };
  }

  const data = parsed.data;
  const supabase = await createClient();
  const signUp = await signUpUser(supabase, data.email, data.password, data.full_name);

  if (signUp.error || !signUp.data.user?.id) {
    return { error: signUp.error?.message ?? 'Could not create faculty account.' };
  }

  const userId = signUp.data.user.id;

  // Upload proof of schooling / ID document
  let schoolDocUrl: string | null = null;
  try {
    schoolDocUrl = await uploadSchoolDocument(userId, schoolDocFile);
    console.log(`[faculty/register] proof document uploaded successfully: ${schoolDocUrl}`);
  } catch (uploadErr: unknown) {
    console.error('[faculty/register] proof document upload failed:', uploadErr);
    await deleteAuthUser(userId);
    const uploadMsg = uploadErr instanceof Error ? uploadErr.message : 'Unknown error';
    return { error: `Failed to upload proof document: ${uploadMsg}. Please try again.` };
  }

  const { error } = await createAdminClient().from('profiles').insert({
    id: userId,
    email: data.email,
    profile_type: 'faculty',
    full_name: data.full_name,
    batch_year: data.batch_year,
    course: data.course,
    phone: data.phone || null,
    current_city: data.current_city || null,
    current_state: data.current_state || null,
    current_country: data.current_country || 'India',
    taught_subject: data.taught_subject,
    taught_from_year: data.taught_from_year,
    taught_to_year: data.taught_to_year || null,
    bio: data.bio || null,
    hide_email: data.hide_email,
    hide_phone: data.hide_phone,
    role: 'pending',
    approval_status: 'pending',
    school_document_url: schoolDocUrl,
  });

  if (error) {
    await deleteAuthUser(userId);
    return { error: `Failed to save faculty profile: ${error.message}` };
  }

  if (signUp.data.user.email_confirmed_at) {
    redirect('/pending-approval');
  }

  redirect('/verify-email');
}
