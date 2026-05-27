'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2, Eye, EyeOff, Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnnouncementActionsProps {
  id: string;
  isPublished: boolean;
  isPinned: boolean;
}

export function AnnouncementActions({ id, isPublished, isPinned }: AnnouncementActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleTogglePublish() {
    startTransition(async () => {
      await fetch(`/api/admin/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !isPublished }),
      });
      router.refresh();
    });
  }

  function handleTogglePin() {
    startTransition(async () => {
      await fetch(`/api/admin/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !isPinned }),
      });
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    startTransition(async () => {
      await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        title={isPinned ? 'Unpin' : 'Pin'}
        onClick={handleTogglePin}
        disabled={isPending}
        className="h-8 w-8"
      >
        {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        title={isPublished ? 'Unpublish' : 'Publish'}
        onClick={handleTogglePublish}
        disabled={isPending}
        className="h-8 w-8"
      >
        {isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
        <Link href={`/admin/announcements/${id}/edit`}>
          <Pencil className="h-3.5 w-3.5" />
        </Link>
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
