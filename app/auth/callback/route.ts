import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Supabase email-confirmation / OAuth callback.
 * Exchanges the URL `code` for a session, then routes the user.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      if (redirectTo === '/auth/reset-password') {
        return NextResponse.redirect(`${origin}/forgot-password?error=invalid_link`);
      }

      return NextResponse.redirect(`${origin}/login?error=verification_failed`);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    let hasProfile = false;
    if (user) {
      try {
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          hasProfile = true;
          await admin
            .from('profiles')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', user.id);
        }
      } catch (error) {
        console.warn('[auth/callback] profile check / last_seen_at update skipped:', error);
      }
    }

    // If resetting password, proceed to reset page even if profile is missing (should not happen)
    const isReset = redirectTo === '/auth/reset-password';
    const finalRedirect = (hasProfile || isReset) ? redirectTo : '/register/complete';
    return NextResponse.redirect(`${origin}${finalRedirect}`);
  }

  // No code present — redirect to login
  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}
