'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import type { Database } from '@/lib/supabase/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

export function useProfile() {
  const { user, supabase, loading: authLoading } = useAuth();
  const [state, setState] = useState<ProfileState>({
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ profile: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    async function fetchProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (cancelled) return;

      if (error) {
        setState({ profile: null, loading: false, error: error.message });
      } else {
        setState({ profile: data, loading: false, error: null });
      }
    }

    fetchProfile();
    return () => { cancelled = true; };
  }, [user, authLoading, supabase]);

  const isAdmin = state.profile?.role === 'admin' || state.profile?.role === 'super_admin';
  const isApproved = state.profile?.approval_status === 'approved';
  const isPaidMember = state.profile?.is_paid_member ?? false;

  return { ...state, isAdmin, isApproved, isPaidMember };
}
