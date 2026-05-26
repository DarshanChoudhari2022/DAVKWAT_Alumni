'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2, Eye, EyeOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EventActionsProps {
  id: string;
  slug: string;
  isPublished: boolean;
}

export function EventActions({ id, slug: _slug, isPublished }: EventActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleTogglePublish() {
    startTransition(async () => {
      await fetch(`/api/admin/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !isPublished }),
      });
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm('Are you sure you want to delete this event?')) return;
    startTransition(async () => {
      await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
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
      <Button variant="ghost" size="icon" asChild className="h-8 w-8" title="RSVPs">
        <Link href={`/admin/events/${id}/rsvps`}>
          <Users className="h-3.5 w-3.5" />
        </Link>
      </Button>
      <Button variant="ghost" size="icon" asChild className="h-8 w-8" title="Edit">
        <Link href={`/admin/events/${id}/edit`}>
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
