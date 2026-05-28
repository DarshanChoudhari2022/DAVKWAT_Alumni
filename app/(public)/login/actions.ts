'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validations/registration';

export interface AuthState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString();
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: 'Invalid email or password.' };
  }

  // Check approval status to send to the right page
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Login failed. Please try again.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, approval_status')
    .eq('id', user.id)
    .single();

  revalidatePath('/', 'layout');

  if (!profile) {
    await supabase.auth.signOut();
    return { error: 'Your account profile was not found. Please contact admin or try registering again.' };
  }

  if (profile.approval_status !== 'approved') {
    redirect('/pending-approval');
  }
  if (['admin', 'super_admin'].includes(profile.role)) {
    redirect('/admin');
  }
  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
