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

  // Backend Security Gating: check profile status
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, approval_status, is_paid_member, profile_type')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.approval_status !== 'approved') {
    return { error: 'Your registration must be approved before registering for events.' };
  }

  const isPaidOrFaculty = profile.is_paid_member || profile.profile_type === 'faculty';
  if (!isPaidOrFaculty) {
    return { error: 'An active membership is required to register for events.' };
  }

  const eventId = formData.get('event_id')?.toString();
  const slug = formData.get('slug')?.toString();

  if (!eventId) {
    return { error: 'Invalid event.' };
  }

  // Capacity and registration-window checks
  const [{ data: event }, { count: goingCount }] = await Promise.all([
    supabase
      .from('events')
      .select('max_attendees, starts_at, registration_deadline')
      .eq('id', eventId)
      .single(),
    supabase
      .from('event_rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId),
  ]);

  if (!event) {
    return { error: 'This event no longer exists.' };
  }

  const now = Date.now();
  const startsAt = new Date(event.starts_at).getTime();
  const deadline = event.registration_deadline
    ? new Date(event.registration_deadline).getTime()
    : null;

  if (startsAt <= now || (deadline !== null && deadline <= now)) {
    return { error: 'RSVPs are closed for this event.' };
  }

  if (
    event.max_attendees != null &&
    goingCount !== null &&
    goingCount + 1 > event.max_attendees
  ) {
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
