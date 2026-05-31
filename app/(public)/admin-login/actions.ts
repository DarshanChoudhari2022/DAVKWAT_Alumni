'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  isLocalAdminLoginConfigured,
  verifyLocalAdminCredentials,
} from '@/lib/auth/local-admin';
import { clearLocalAdminSession, startLocalAdminSession } from '@/lib/auth/local-admin-cookie';
import { isAdminRoute, normalizeInternalRedirect } from '@/lib/utils/auth-routing';
import { loginSchema } from '@/lib/validations/registration';

export interface AdminAuthState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function resolveAdminRedirect(requestedPath: string | null | undefined) {
  const safeRedirect = normalizeInternalRedirect(requestedPath);

  if (!safeRedirect) {
    return '/admin';
  }

  const [pathname] = safeRedirect.split('?');
  return pathname && isAdminRoute(pathname) ? safeRedirect : '/admin';
}

export async function adminLoginAction(
  _prev: AdminAuthState,
  formData: FormData
): Promise<AdminAuthState> {
  if (!isLocalAdminLoginConfigured()) {
    return {
      error:
        'Local admin login is not configured. Add ADMIN_LOGIN_EMAIL, ADMIN_LOGIN_PASSWORD, and ADMIN_SESSION_SECRET to .env.local.',
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }

    return { fieldErrors };
  }

  const isValid = await verifyLocalAdminCredentials(parsed.data.email, parsed.data.password);
  if (!isValid) {
    return { error: 'Invalid admin email or password.' };
  }

  await startLocalAdminSession(parsed.data.email);
  revalidatePath('/', 'layout');

  redirect(resolveAdminRedirect(formData.get('redirect')?.toString()));
}

export async function adminLogoutAction() {
  await clearLocalAdminSession();

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore Supabase logout failures when local admin access is being used.
  }

  revalidatePath('/', 'layout');
  redirect('/admin-login');
}
