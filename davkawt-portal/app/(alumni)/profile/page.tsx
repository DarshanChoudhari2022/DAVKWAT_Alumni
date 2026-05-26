import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/shared/Avatar';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from './ProfileForm';

export const metadata: Metadata = { title: 'My Profile' };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex items-center gap-4">
        <Avatar src={profile.avatar_url} name={profile.full_name} size="xl" />
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{profile.full_name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Batch {profile.batch_year} · {profile.course} · {profile.email}
          </p>
        </div>
      </header>

      <Card className="mt-8 p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold">Edit profile</h2>
        <p className="mt-1 text-sm text-slate-500">
          These details appear on your alumni directory listing. Use the privacy toggles to hide
          your contact info from other alumni.
        </p>
        <ProfileForm profile={profile} />
      </Card>
    </div>
  );
}
