import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AnnouncementForm } from '../../AnnouncementForm';

export const metadata: Metadata = { title: 'Edit Announcement — Admin' };

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('announcements')
    .select('id, title, content, is_pinned')
    .eq('id', id)
    .single();

  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Edit Announcement</h1>
      <p className="mt-1 text-sm text-slate-500">Update the announcement details below.</p>
      <div className="mt-6">
        <AnnouncementForm
          initial={{
            id: data.id,
            title: data.title,
            content: data.content,
            is_pinned: data.is_pinned,
          }}
        />
      </div>
    </div>
  );
}
