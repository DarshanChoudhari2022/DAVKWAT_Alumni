'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface RsvpState {
  error?: string;
  success?: boolean;
}

export async function rsvpAction(
  _prev: RsvpState,
  formData: FormData
): Promise<RsvpState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please log in to RSVP.' };

  const eventId = formData.get('event_id')?.toString();
  const slug = formData.get('slug')?.toString();

  if (!eventId) {
    return { error: 'Invalid event.' };
  }

  // Capacity check
  const [{ data: event }, { count: goingCount }] = await Promise.all([
    supabase.from('events').select('max_attendees').eq('id', eventId).single(),
    supabase
      .from('event_rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId),
  ]);

  if (event?.max_attendees && goingCount !== null && goingCount + 1 > event.max_attendees) {
    return { error: 'Sorry, this event is full.' };
  }

  const { error } = await supabase.from('event_rsvps').upsert(
    {
      event_id: eventId,
      alumni_id: user.id,
    },
    { onConflict: 'event_id,alumni_id' }
  );

  if (error) {
    console.error('[rsvp]', error);
    return { error: 'Could not save your RSVP. Please try again.' };
  }

  if (slug) revalidatePath(`/events/${slug}`);
  revalidatePath('/events');
  revalidatePath('/dashboard');
  return { success: true };
}
