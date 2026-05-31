'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ReplyModerationButton({
  replyId,
  isDeleted,
}: {
  replyId: string;
  isDeleted: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/forum/replies/${replyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_deleted: !isDeleted }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Could not update the reply.');
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" variant={isDeleted ? 'outline' : 'destructive'} size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? 'Saving...' : isDeleted ? 'Restore reply' : 'Remove reply'}
      </Button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
