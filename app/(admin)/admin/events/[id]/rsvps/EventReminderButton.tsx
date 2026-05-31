'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

export function EventReminderButton({ eventId }: { eventId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const res = await fetch(`/api/admin/events/${eventId}/reminders`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not send reminders.');
        return;
      }

      setMessage(`Sent ${data.sent} reminder email(s).${data.failed ? ` ${data.failed} failed.` : ''}`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleSend} disabled={isPending}>
        {isPending ? 'Sending reminders...' : 'Send Reminder Emails'}
      </Button>
      {message && <p className="text-xs text-emerald-600">{message}</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
