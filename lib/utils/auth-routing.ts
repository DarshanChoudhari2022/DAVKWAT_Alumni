const ALUMNI_ROUTE_PREFIXES = [
  '/dashboard',
  '/directory',
  '/profile',
  '/announcements',
  '/events',
  '/forum',
  '/membership',
];

const ADMIN_ROUTE_PREFIXES = ['/admin'];
const BLOCKED_REDIRECT_PREFIXES = ['/api', '/auth'];
const BLOCKED_REDIRECT_PATHS = new Set(['/login', '/register', '/forgot-password']);

type RoleLike = string | null | undefined;
type ApprovalLike = string | null | undefined;

function matchesRoute(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isAlumniRoute(pathname: string) {
  return matchesRoute(pathname, ALUMNI_ROUTE_PREFIXES);
}

export function isAdminRoute(pathname: string) {
  return matchesRoute(pathname, ADMIN_ROUTE_PREFIXES);
}

export function isAdminRole(role: RoleLike) {
  return role === 'admin' || role === 'super_admin';
}

export function getDefaultSignedInPath(role: RoleLike, approvalStatus: ApprovalLike) {
  if (approvalStatus !== 'approved') {
    return '/pending-approval';
  }

  return isAdminRole(role) ? '/admin' : '/dashboard';
}

export function normalizeInternalRedirect(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  const [pathname] = value.split('?');
  if (!pathname || BLOCKED_REDIRECT_PATHS.has(pathname)) {
    return null;
  }

  if (
    BLOCKED_REDIRECT_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return null;
  }

  return value;
}

export function resolveSignedInRedirect(
  requestedPath: string | null | undefined,
  role: RoleLike,
  approvalStatus: ApprovalLike
) {
  const safeRedirect = normalizeInternalRedirect(requestedPath);

  if (!safeRedirect) {
    return getDefaultSignedInPath(role, approvalStatus);
  }

  if (approvalStatus !== 'approved') {
    return '/pending-approval';
  }

  if (isAdminRoute(safeRedirect) && !isAdminRole(role)) {
    return '/dashboard';
  }

  return safeRedirect;
}
