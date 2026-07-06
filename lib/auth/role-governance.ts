type AdminActorRole = 'admin' | 'super_admin';
type AssignableUserRole = 'pending' | 'alumni' | 'admin' | 'super_admin';

const ELEVATED_ROLES = new Set<AssignableUserRole>(['admin', 'super_admin']);

export function canAssignRole({
  actorRole,
  requestedRole,
}: {
  actorRole: AdminActorRole;
  requestedRole: AssignableUserRole;
}) {
  if (ELEVATED_ROLES.has(requestedRole)) {
    return actorRole === 'super_admin';
  }

  return true;
}
