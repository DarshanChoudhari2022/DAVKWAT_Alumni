import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/shared/Avatar';
import { Skeleton } from '@/components/shared/Skeleton';
import { SectionError } from '@/components/shared/SectionError';
import { requireAlumniAccess } from '@/lib/auth/alumni-access';
import { ProfileForm } from './ProfileForm';

export const metadata: Metadata = { title: 'My Profile' };

export default async function ProfilePage() {
  // Auth is memoized per request — no redundant getUser() calls (Req 1.1, 1.2)
  const { profile } = await requireAlumniAccess();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Shell: heading + avatar (synchronous, streams immediately) */}
      <header className="flex items-center gap-4">
        <Avatar src={profile.avatar_url} name={profile.full_name} size="xl" />
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{profile.full_name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Batch {profile.batch_year} · {profile.course} · {profile.email}
          </p>
        </div>
      </header>

      {/* Profile form region (async, identity-scoped — always fresh, never cached) */}
      <Suspense fallback={<ProfileFormSkeleton />}>
        <ProfileFormRegion />
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Async region: Profile form (identity-scoped, fresh via RLS-scoped client)
// ---------------------------------------------------------------------------

async function ProfileFormRegion() {
  try {
    const { database, userId } = await requireAlumniAccess();

    // Always query fresh under the user's RLS-scoped client (Req 3.6, 7.1, 7.3)
    const { data: fullProfile } = await database
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!fullProfile) {
      return <SectionError title="Profile not found." message="Your profile data could not be loaded." />;
    }

    return (
      <Card className="mt-8 p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold">Edit profile</h2>
        <p className="mt-1 text-sm text-slate-500">
          These details appear on your alumni directory listing. Use the privacy toggles to hide
          your contact info from other alumni.
        </p>
        <ProfileForm profile={fullProfile} />
      </Card>
    );
  } catch {
    return <SectionError title="Couldn't load your profile." />;
  }
}

// ---------------------------------------------------------------------------
// Skeleton fallback for the profile form region
// ---------------------------------------------------------------------------

function ProfileFormSkeleton() {
  return (
    <Card className="mt-8 p-6 sm:p-8">
      <Skeleton className="mb-2 h-6 w-32" />
      <Skeleton className="mb-6 h-4 w-64" />
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-4 rounded-xl border border-slate-100 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </Card>
  );
}
