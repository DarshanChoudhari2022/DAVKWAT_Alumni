'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { guestRsvpAction, type GuestRsvpState } from './guest-rsvp-actions';

const initialState: GuestRsvpState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending}>Submit RSVP</Button>;
}

function ErrorText({ messages }: { messages?: string[] }) {
  return messages?.[0] ? <p className="mt-1 text-xs text-rose-600">{messages[0]}</p> : null;
}

export function GuestRsvpForm({ eventId, sourcePath }: { eventId: string; sourcePath: string }) {
  const [state, action] = useActionState(guestRsvpAction, initialState);

  if (state.success) {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-medium">RSVP confirmed</p>
          <p className="mt-1 text-sm">
            {state.alreadyRegistered
              ? 'Your existing RSVP details have been updated.'
              : 'Your details have been recorded for this event.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="mt-4 space-y-4">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="source_path" value={sourcePath} />
      <div className="hidden" aria-hidden="true">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      {state.error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{state.error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Full name <span className="text-rose-600">*</span>
          <input name="name" required maxLength={120} autoComplete="name" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal" />
          <ErrorText messages={state.fieldErrors?.name} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Email <span className="text-rose-600">*</span>
          <input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal" />
          <ErrorText messages={state.fieldErrors?.email} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Phone <span className="text-rose-600">*</span>
          <input name="phone" type="tel" required maxLength={20} autoComplete="tel" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal" />
          <ErrorText messages={state.fieldErrors?.phone} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Batch year
          <input name="batch_year" type="number" min="1950" max="2100" inputMode="numeric" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal" />
          <ErrorText messages={state.fieldErrors?.batch_year} />
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        City
        <input name="city" maxLength={100} autoComplete="address-level2" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal" />
      </label>
      <div className="flex items-center gap-3">
        <SubmitButton />
        <p className="text-xs text-slate-500">No account or payment is required to RSVP.</p>
      </div>
    </form>
  );
}
