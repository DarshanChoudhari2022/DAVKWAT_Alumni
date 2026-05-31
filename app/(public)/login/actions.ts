'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { resolveSignedInRedirect } from '@/lib/utils/auth-routing';
import { loginSchema } from '@/lib/validations/registration';

export interface AuthState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const redirectTo = formData.get('redirect')?.toString();
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

  // Use Prisma instead of Supabase client for profile query
  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { role: true, approval_status: true },
  });

  revalidatePath('/', 'layout');

  if (!profile) {
    await supabase.auth.signOut();
    return { error: 'Your account profile was not found. Please contact admin or try registering again.' };
  }

  redirect(resolveSignedInRedirect(redirectTo, profile.role, profile.approval_status));
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
