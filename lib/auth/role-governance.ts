type AssignableUserRole = 'pending' | 'alumni' | 'admin' | 'super_admin';

export function canAssignRole({
  actorRole: _actorRole,
  requestedRole,
}: {
  actorRole: 'admin' | 'super_admin';
  requestedRole: AssignableUserRole;
}) {
  return ['pending', 'alumni', 'admin', 'super_admin'].includes(requestedRole);
}
