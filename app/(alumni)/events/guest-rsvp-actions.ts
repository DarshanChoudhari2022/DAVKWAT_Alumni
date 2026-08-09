'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export interface GuestRsvpState {
  success?: boolean;
  alreadyRegistered?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const guestRsvpSchema = z.object({
  event_id: z.string().uuid(),
  source_path: z.string().startsWith('/').max(300),
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  phone: z.string().trim().min(8, 'Enter a valid phone number').max(20),
  batch_year: z.preprocess(
    (value) => value === '' ? null : value,
    z.coerce.number().int().min(1950).max(2100).nullable()
  ),
  city: z.string().trim().max(100).optional(),
  website: z.string().max(0),
});

export async function guestRsvpAction(
  _previous: GuestRsvpState,
  formData: FormData
): Promise<GuestRsvpState> {
  const parsed = guestRsvpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: 'Please check the highlighted details.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('submit_guest_rsvp', {
    p_event_id: parsed.data.event_id,
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_phone: parsed.data.phone,
    p_batch_year: parsed.data.batch_year,
    p_city: parsed.data.city || null,
  });

  if (error) {
    const message = error.code === 'P0002'
      ? 'This event is no longer available.'
      : error.message.includes('closed')
        ? 'RSVPs are closed for this event.'
        : error.message.includes('full')
          ? 'This event is full.'
          : 'Could not save your RSVP. Please try again.';
    return { error: message };
  }

  const result = data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
  revalidatePath(parsed.data.source_path);
  return { success: true, alreadyRegistered: result.already_registered === true };
}
