'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { readApiResponse } from '@/lib/utils/api-client';

export function DeleteRejectedAlumniButton({
  alumniId,
  iconOnly = false,
}: {
  alumniId: string;
  iconOnly?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    const confirmationText = window.prompt('Type Delete to permanently delete this alumni record.');
    if (confirmationText !== 'Delete') {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/alumni/${alumniId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationText }),
      });
      const data = await readApiResponse<{ error?: string }>(response);
      if (!response.ok) {
        window.alert(data.error ?? 'Could not delete this alumni record.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      className={iconOnly ? 'h-9 w-9 px-0' : 'w-full sm:w-auto'}
      title="Delete profile"
      aria-label="Delete profile"
    >
      <Trash2 className="h-4 w-4" />
      {!iconOnly && 'Delete'}
    </Button>
  );
}
