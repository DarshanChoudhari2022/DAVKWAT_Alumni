import type { Metadata } from 'next';
import { AnnouncementForm } from '../AnnouncementForm';
import { requireAdminAccess } from '@/lib/auth/admin-access';

export const metadata: Metadata = { title: 'New Announcement — Admin' };

export default async function NewAnnouncementPage() {
  const { database } = await requireAdminAccess();
  const { data: events } = await database
    .from('events')
    .select('id, title, starts_at')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(100);
  return (
    <div className="mx-auto max-w-3xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">New Announcement</h1>
      <p className="mt-1 text-sm text-slate-500">Create a new announcement for alumni.</p>
      <div className="mt-6">
        <AnnouncementForm events={events ?? []} />
      </div>
    </div>
  );
}
