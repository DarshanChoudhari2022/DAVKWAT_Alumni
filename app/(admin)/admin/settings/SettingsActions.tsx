'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface SettingsActionsProps {
  planId: string;
  isActive: boolean;
}

export function SettingsActions({ planId, isActive }: SettingsActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle() {
    startTransition(async () => {
      await fetch('/api/admin/settings/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planId, is_active: !isActive }),
      });
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    startTransition(async () => {
      await fetch('/api/admin/settings/plans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planId }),
      });
      router.refresh();
    });
  }

  return (
    <div className="grid w-full gap-2 sm:flex sm:w-auto">
      <Button size="sm" variant="outline" onClick={handleToggle} disabled={isPending} className="w-full sm:w-auto">
        {isActive ? 'Deactivate' : 'Activate'}
      </Button>
      <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isPending} className="w-full sm:w-auto">
        Delete
      </Button>
    </div>
  );
}
