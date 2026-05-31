import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './database.types';
import {
  isAdminRole,
  isAdminRoute,
  isAlumniRoute,
  resolveSignedInRedirect,
} from '@/lib/utils/auth-routing';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

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
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const requestedPath = `${pathname}${request.nextUrl.search}`;

  const needsAlumni = isAlumniRoute(pathname);
  const needsAdmin = isAdminRoute(pathname);
  const isAuthPage = AUTH_ROUTES.some((r) => pathname === r);

  // Not logged in -> redirect protected routes to /login
  if (!user && (needsAlumni || needsAdmin)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', requestedPath);
    return NextResponse.redirect(url);
  }

  if (user) {
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

    if (needsAlumni || needsAdmin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, approval_status')
        .eq('id', user.id)
        .single();

      if (!profile) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
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
  }

  return response;
}
