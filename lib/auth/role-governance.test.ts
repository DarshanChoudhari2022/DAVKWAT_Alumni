import { describe, expect, it } from 'vitest';
import { canAssignRole } from './role-governance';

describe('admin role governance', () => {
  it('allows approved admins to assign elevated admin roles', () => {
    expect(canAssignRole({ actorRole: 'admin', requestedRole: 'admin' })).toBe(true);
    expect(canAssignRole({ actorRole: 'admin', requestedRole: 'super_admin' })).toBe(true);
    expect(canAssignRole({ actorRole: 'super_admin', requestedRole: 'admin' })).toBe(true);
    expect(canAssignRole({ actorRole: 'super_admin', requestedRole: 'super_admin' })).toBe(true);
  });

  it('allows approved admins to assign non-elevated alumni workflow roles', () => {
    expect(canAssignRole({ actorRole: 'admin', requestedRole: 'alumni' })).toBe(true);
    expect(canAssignRole({ actorRole: 'admin', requestedRole: 'pending' })).toBe(true);
  });
});
