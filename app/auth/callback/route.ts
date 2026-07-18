import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type SupportedOtpType = 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change';

/**
 * Supabase email-confirmation / recovery callback.
 * Handles both PKCE code links and token-hash links before routing the user.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as SupportedOtpType | null;
  const redirectTo = searchParams.get('redirect') ?? '/dashboard';
  const isReset = redirectTo === '/auth/reset-password' || type === 'recovery';
  const authError = searchParams.get('error') || searchParams.get('error_code');

  if (authError) {
    return redirectForAuthFailure(origin, isReset, authError);
  }

  const supabase = await createClient();
  let sessionUserId: string | null = null;

  if (code) {
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.warn('[auth/callback] code exchange failed:', error.message);
      return redirectForAuthFailure(origin, isReset, 'verification_failed');
    }

    sessionUserId = sessionData?.user?.id ?? null;
  } else if (tokenHash && type) {
    const { data: verifyData, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      console.warn('[auth/callback] token verification failed:', error.message);
      return redirectForAuthFailure(origin, isReset, 'verification_failed');
    }

    sessionUserId = verifyData?.user?.id ?? null;
  } else {
    return redirectForAuthFailure(origin, isReset, 'missing_code');
  }

  if (isReset) {
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  }

  let hasProfile = false;
  if (sessionUserId) {
    try {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('id', sessionUserId)
        .maybeSingle();

      if (profile) {
        hasProfile = true;
        void admin
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', sessionUserId)
          .then(({ error: updateErr }) => {
            if (updateErr) console.warn('[auth/callback] last_seen_at update skipped:', updateErr.message);
          });
      }
    } catch (error) {
      console.warn('[auth/callback] profile check / last_seen_at update skipped:', error);
    }
  }

  return NextResponse.redirect(`${origin}${hasProfile ? redirectTo : '/register/complete'}`);
}

function redirectForAuthFailure(origin: string, isReset: boolean, errorCode: string) {
  const path = isReset
    ? '/forgot-password?error=invalid_link'
    : `/login?error=${encodeURIComponent(errorCode)}`;

  return NextResponse.redirect(`${origin}${path}`);
}

