import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EventForm } from '../../EventForm';

export const metadata: Metadata = { title: 'Edit Event — Admin' };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('events')
    .select('id, title, description, event_type, venue, online_link, starts_at, ends_at, max_attendees')
    .eq('id', id)
    .single();

  if (!data) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Edit Event</h1>
      <p className="mt-1 text-sm text-slate-500">Update the event details below.</p>
      <div className="mt-6">
        <EventForm
          initial={{
            id: data.id,
            title: data.title,
            description: data.description ?? '',
            event_type: data.event_type,
            venue: data.venue ?? '',
            online_link: data.online_link ?? '',
            starts_at: data.starts_at,
            ends_at: data.ends_at ?? '',
            max_attendees: data.max_attendees,
          }}
        />
      </div>
    </div>
  );
}
