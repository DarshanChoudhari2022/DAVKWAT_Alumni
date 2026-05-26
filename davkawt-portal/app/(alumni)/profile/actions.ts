'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { profileUpdateSchema } from '@/lib/validations/profile';

export interface ProfileState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  if (raw.batch_year) raw.batch_year = Number(raw.batch_year);
  raw.hide_email = formData.get('hide_email') === 'on';
  raw.hide_phone = formData.get('hide_phone') === 'on';

  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString();
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors };
  }

  const d = parsed.data;
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: d.full_name,
      batch_year: d.batch_year,
      course: d.course,
      roll_number: d.roll_number || null,
      phone: d.phone || null,
      current_city: d.current_city || null,
      current_state: d.current_state || null,
      current_country: d.current_country || null,
      date_of_birth: d.date_of_birth || null,
      gender: d.gender || null,
      occupation: d.occupation || null,
      company: d.company || null,
      job_title: d.job_title || null,
      industry: d.industry || null,
      linkedin_url: d.linkedin_url || null,
      bio: d.bio || null,
      hide_email: d.hide_email,
      hide_phone: d.hide_phone,
    })
    .eq('id', user.id);

  if (error) {
    console.error('[profile.update]', error);
    return { error: 'Could not save your profile. Please try again.' };
  }

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  revalidatePath('/directory');
  return { success: true };
}
