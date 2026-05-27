'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function CategoryForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }
    setError(null);

    startTransition(async () => {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);

      const res = await fetch('/api/admin/forum/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          slug,
          display_order: parseInt(displayOrder, 10) || 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to create category.');
        return;
      }

      router.push('/admin/forum');
      router.refresh();
    });
  }

  const inputCls =
    'h-10 w-full rounded-lg border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]';

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>
        )}

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Category Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputCls}
            placeholder="e.g. General Discussion"
          />
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            placeholder="Brief description of this category"
          />
        </div>

        <div>
          <label htmlFor="display_order" className="mb-1 block text-sm font-medium text-slate-700">
            Display Order
          </label>
          <input
            id="display_order"
            type="number"
            min="0"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Creating…' : 'Create Category'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/forum')}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
