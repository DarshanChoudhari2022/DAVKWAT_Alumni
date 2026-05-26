import type { Metadata } from 'next';
import { AnnouncementForm } from '../AnnouncementForm';

export const metadata: Metadata = { title: 'New Announcement — Admin' };

export default function NewAnnouncementPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">New Announcement</h1>
      <p className="mt-1 text-sm text-slate-500">Create a new announcement for alumni.</p>
      <div className="mt-6">
        <AnnouncementForm />
      </div>
    </div>
  );
}
