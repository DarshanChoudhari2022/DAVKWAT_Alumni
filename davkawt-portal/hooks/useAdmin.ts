'use client';

import { useProfile } from './useProfile';

export function useAdmin() {
  const { profile, loading, error, isAdmin } = useProfile();
  const isSuperAdmin = profile?.role === 'super_admin';

  return {
    profile,
    loading,
    error,
    isAdmin,
    isSuperAdmin,
    canManageAdmins: isSuperAdmin,
    canAccessAdmin: isAdmin,
  };
}
