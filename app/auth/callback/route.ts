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
    if (user) {
      try {
        await createAdminClient()
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch (error) {
        console.warn('[auth/callback] last_seen_at update skipped:', error);
      }
    }
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
