'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Pin, PinOff, Lock, Unlock, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ForumActionsProps {
  type: 'category' | 'thread';
  id: string;
  isActive?: boolean;
  isPinned?: boolean;
  isLocked?: boolean;
}

export function ForumActions({ type, id, isActive, isPinned, isLocked }: ForumActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function patch(body: Record<string, unknown>) {
    startTransition(async () => {
      await fetch(`/api/admin/forum/${type === 'category' ? 'categories' : 'threads'}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      router.refresh();
    });
  }

  function handleDelete() {
    const label = type === 'category' ? 'category (and all its threads)' : 'thread';
    if (!confirm(`Are you sure you want to delete this ${label}?`)) return;
    startTransition(async () => {
      await fetch(`/api/admin/forum/${type === 'category' ? 'categories' : 'threads'}/${id}`, {
        method: 'DELETE',
      });
      router.refresh();
    });
  }

  if (type === 'category') {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          title={isActive ? 'Deactivate' : 'Activate'}
          onClick={() => patch({ is_active: !isActive })}
          disabled={isPending}
          className="h-8 w-8"
        >
          {isActive ? <ToggleRight className="h-3.5 w-3.5 text-emerald-500" /> : <ToggleLeft className="h-3.5 w-3.5 text-slate-400" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Delete"
          onClick={handleDelete}
          disabled={isPending}
          className="h-8 w-8 text-rose-500 hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button variant="ghost" size="icon" asChild className="h-8 w-8" title="Moderate">
        <Link href={`/admin/forum/threads/${id}`}>
          <Pencil className="h-3.5 w-3.5" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={isPinned ? 'Unpin' : 'Pin'}
        onClick={() => patch({ is_pinned: !isPinned })}
        disabled={isPending}
        className="h-8 w-8"
      >
        {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={isLocked ? 'Unlock' : 'Lock'}
        onClick={() => patch({ is_locked: !isLocked })}
        disabled={isPending}
        className="h-8 w-8"
      >
        {isLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title="Delete"
        onClick={handleDelete}
        disabled={isPending}
        className="h-8 w-8 text-rose-500 hover:text-rose-600"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
