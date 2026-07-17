'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { readApiResponse } from '@/lib/utils/api-client';

export function DeleteRejectedAlumniButton({ alumniId }: { alumniId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    const confirmationText = window.prompt('Type Delete to permanently delete this rejected entry.');
    if (confirmationText !== 'Delete') {
      return;
    }

    const adminPassword = window.prompt('Enter the admin password to permanently delete this rejected entry.');
    if (!adminPassword) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/alumni/${alumniId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword, confirmationText }),
      });
      const data = await readApiResponse<{ error?: string }>(response);
      if (!response.ok) {
        window.alert(data.error ?? 'Could not delete this rejected entry.');
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
      className="w-full sm:w-auto"
    >
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
  );
}
