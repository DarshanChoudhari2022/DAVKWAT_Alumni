'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { rsvpAction, type RsvpState } from './actions';

interface Props {
  eventId: string;
  slug: string;
  hasRsvp: boolean;
  spotsLeft: number | null;
}

const initial: RsvpState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? 'Saving…' : label}
    </Button>
  );
}

export function RsvpForm({ eventId, slug, hasRsvp, spotsLeft }: Props) {
  const [state, action] = useActionState(rsvpAction, initial);

  const isRegistered = state.success || (hasRsvp && !state.error);

  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="slug" value={slug} />

      {state.error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}
      {isRegistered && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <Check aria-hidden className="h-3.5 w-3.5" />
          You are registered for this event
        </div>
      )}

      {spotsLeft !== null && spotsLeft <= 0 && !isRegistered ? (
        <p className="text-sm text-slate-500">This event is full.</p>
      ) : !isRegistered ? (
        <SubmitButton label="Register for this event" />
      ) : null}
    </form>
  );
}
