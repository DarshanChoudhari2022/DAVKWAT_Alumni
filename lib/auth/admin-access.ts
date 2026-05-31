import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getLocalAdminSession } from './local-admin-cookie';

type AdminRole = 'admin' | 'super_admin';
type AdminDatabaseClient =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createAdminClient>;

interface AdminProfileLookup {
  id: string;
  full_name: string;
  email: string;
  role: AdminRole;
}

export interface AdminAccess {
  actorProfileId: string | null;
  database: AdminDatabaseClient;
  displayName: string;
  email: string;
  mode: 'local' | 'supabase';
  role: AdminRole;
}

async function resolveLocalAdminProfile(
  supabase: ReturnType<typeof createAdminClient>,
  email: string
) {
  const explicitProfileId = process.env.ADMIN_PROFILE_ID?.trim();

  if (explicitProfileId) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', explicitProfileId)
      .in('role', ['admin', 'super_admin'])
      .maybeSingle();

    if (data) {
      return data as AdminProfileLookup;
    }
  }

  const { data: matchingProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('email', email)
    .in('role', ['admin', 'super_admin'])
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: true })
    .limit(1);

  if (matchingProfiles?.[0]) {
    return matchingProfiles[0] as AdminProfileLookup;
  }

  const { data: fallbackProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('role', ['admin', 'super_admin'])
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: true })
    .limit(1);

  return (fallbackProfiles?.[0] as AdminProfileLookup | undefined) ?? null;
}

export function getAdminActorProfileErrorMessage() {
  return (
    'Admin write access needs an approved admin profile in Supabase. ' +
    'Set ADMIN_PROFILE_ID or promote an alumni profile to admin first.'
  );
}

export async function getAdminAccess(): Promise<AdminAccess | null> {
  const localSession = await getLocalAdminSession();

  if (localSession) {
    const supabase = createAdminClient();
    const profile = await resolveLocalAdminProfile(supabase, localSession.email);

    return {
      actorProfileId: profile?.id ?? null,
      database: supabase,
      displayName: profile?.full_name ?? 'Local Admin',
      email: localSession.email,
      mode: 'local',
      role: profile?.role ?? 'super_admin',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, approval_status')
    .eq('id', user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.approval_status !== 'approved' ||
    !['admin', 'super_admin'].includes(profile.role)
  ) {
    return null;
  }

  return {
    actorProfileId: user.id,
    database: supabase,
    displayName: profile.full_name,
    email: profile.email,
    mode: 'supabase',
    role: profile.role as AdminRole,
  };
}

export async function requireAdminAccess() {
  const access = await getAdminAccess();

  if (!access) {
    redirect('/admin-login');
  }

  return access;
}
