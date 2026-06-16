import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './database.types';
import {
  isAdminRole,
  isAdminRoute,
  isAlumniRoute,
  resolveSignedInRedirect,
} from '@/lib/utils/auth-routing';
import {
  LOCAL_ADMIN_COOKIE_NAME,
  verifyLocalAdminSessionToken,
} from '@/lib/auth/local-admin';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/admin-login'];

// Trusted, server-set request header carrying the middleware-verified user id.
// It is stripped from every inbound request before verification (never trusted from
// the client) and re-set only after a successful server-side getUser().
const TRUSTED_IDENTITY_HEADER = 'x-admin-user-id';

type PendingCookie = { name: string; value: string; options: CookieOptions };

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // SECURITY (Req 2.3): never trust a client-supplied copy of the trusted identity
  // header. Strip any inbound value before doing anything else so it can never be
  // forwarded downstream, regardless of route class.
  request.headers.delete(TRUSTED_IDENTITY_HEADER);

  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const requestedPath = `${pathname}${request.nextUrl.search}`;
  const needsAlumni = isAlumniRoute(pathname);
  const needsAdmin = isAdminRoute(pathname);
  const isAuthPage = AUTH_ROUTES.some((r) => pathname === r);
  const isCompleteRegister = pathname === '/register/complete';

  // Public, non-auth routes (home, about, privacy, etc.) don't gate on a session.
  // Skipping the Supabase auth round-trip here keeps these pages fast to load.
  if (!needsAlumni && !needsAdmin && !isAuthPage && !isCompleteRegister) {
    return response;
  }

  // Fail-closed helper for protected routes hit by a backend/network error.
  const failClosed = (): NextResponse | null => {
    if (needsAdmin || needsAlumni || isCompleteRegister) {
      const url = request.nextUrl.clone();
      url.pathname = needsAdmin ? '/admin-login' : '/login';
      url.search = '';
      return NextResponse.redirect(url);
    }
    return null;
  };

  const localAdminSession = await verifyLocalAdminSessionToken(
    request.cookies.get(LOCAL_ADMIN_COOKIE_NAME)?.value
  );

  if (localAdminSession) {
    if (pathname === '/admin-login') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      url.search = '';
      return NextResponse.redirect(url);
    }

    // Req 2.2: a valid local-admin cookie authorizes admin routes with zero
    // supabase.auth.getUser() network calls.
    if (needsAdmin) {
      return response;
    }
  }

  // Cookies refreshed by Supabase during verification, captured so they can be
  // re-applied whenever we rebuild the response (e.g. to forward the trusted header).
  let pendingCookies: PendingCookie[] = [];

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          pendingCookies = cookiesToSet as PendingCookie[];
        },
      },
    }
  );

  // Req 2.1: exactly one auth network round-trip on the Supabase path.
  // Req 2.5: fail closed if verification cannot complete (backend/network error).
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    return failClosed() ?? response;
  }

  // Not logged in -> redirect protected routes, preserving the requested path (Req 2.4).
  if (!user && (needsAlumni || needsAdmin || isCompleteRegister)) {
    const url = request.nextUrl.clone();
    url.pathname = needsAdmin ? '/admin-login' : '/login';
    url.searchParams.set('redirect', requestedPath);
    return NextResponse.redirect(url);
  }

  if (user) {
    // Req 2.3: forward the verified identity to the RSC tree so the page-level
    // resolver can reuse it instead of issuing a second auth.getUser() round-trip.
    // Set it on the request headers, then rebuild the response so the modified
    // request propagates downstream, re-applying any cookies Supabase refreshed.
    request.headers.set(TRUSTED_IDENTITY_HEADER, user.id);
    response = NextResponse.next({ request });
    pendingCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options)
    );

    try {
      // Logged in users shouldn't see auth pages if they have a valid profile
      if (isAuthPage) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, approval_status')
          .eq('id', user.id)
          .single();

        if (profile) {
          const url = request.nextUrl.clone();
          url.pathname = resolveSignedInRedirect(
            request.nextUrl.searchParams.get('redirect'),
            profile.role,
            profile.approval_status
          );
          url.search = '';
          return NextResponse.redirect(url);
        }
      }

      if (isCompleteRegister) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, approval_status')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          const url = request.nextUrl.clone();
          url.pathname = resolveSignedInRedirect(
            null,
            profile.role,
            profile.approval_status
          );
          url.search = '';
          return NextResponse.redirect(url);
        }
      }

      if (needsAlumni || needsAdmin) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, approval_status')
          .eq('id', user.id)
          .single();

        if (!profile) {
          const url = request.nextUrl.clone();
          url.pathname = '/register/complete';
          url.search = '';
          return NextResponse.redirect(url);
        }

        if (profile.approval_status !== 'approved') {
          const url = request.nextUrl.clone();
          url.pathname = '/pending-approval';
          url.search = '';
          return NextResponse.redirect(url);
        }

        if (needsAdmin && !isAdminRole(profile.role)) {
          const url = request.nextUrl.clone();
          url.pathname = '/dashboard';
          url.search = '';
          return NextResponse.redirect(url);
        }
      }
    } catch {
      // Req 2.5: fail closed if the gating profile lookup hits a backend error.
      return failClosed() ?? response;
    }
  }

  return response;
}
