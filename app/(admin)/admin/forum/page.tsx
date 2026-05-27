import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, MessageSquare, Lock, Pin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { formatRelative } from '@/lib/utils/format';
import { ForumActions } from './ForumActions';

export const metadata: Metadata = { title: 'Forum Management — Admin' };

export default async function AdminForumPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('forum_categories')
    .select('id, name, description, slug, display_order, is_active')
    .order('display_order', { ascending: true });

  // Get recent threads across all categories
  const { data: threads } = await supabase
    .from('forum_threads')
    .select('id, title, is_pinned, is_locked, reply_count, created_at, category_id, profiles!forum_threads_author_id_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Forum Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage categories and moderate threads.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/forum/categories/new">
            <Plus className="h-4 w-4" />
            New Category
          </Link>
        </Button>
      </header>

      {/* Categories */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Categories</h2>
        <ul className="mt-4 space-y-2">
          {(categories ?? []).map((cat) => (
            <li key={cat.id}>
              <Card className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    <h3 className="font-medium">{cat.name}</h3>
                    {!cat.is_active && <Badge variant="warning">Inactive</Badge>}
                    <Badge variant="default">Order: {cat.display_order}</Badge>
                  </div>
                  {cat.description && (
                    <p className="mt-0.5 text-sm text-slate-500">{cat.description}</p>
                  )}
                </div>
                <ForumActions type="category" id={cat.id} isActive={cat.is_active} />
              </Card>
            </li>
          ))}
          {(categories ?? []).length === 0 && (
            <li><Card className="text-center text-sm text-slate-500">No categories yet.</Card></li>
          )}
        </ul>
      </section>

      {/* Recent threads */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Recent Threads</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-3">Thread</th>
                <th className="pb-2 pr-3">Author</th>
                <th className="pb-2 pr-3">Replies</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(threads ?? []).map((t) => {
                const authorName =
                  t.profiles && !Array.isArray(t.profiles)
                    ? (t.profiles as { full_name: string }).full_name
                    : 'Unknown';
                return (
                  <tr key={t.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        {t.is_pinned && <Pin className="h-3 w-3 text-amber-500" />}
                        {t.is_locked && <Lock className="h-3 w-3 text-slate-400" />}
                        <span className="line-clamp-1 font-medium">{t.title}</span>
                      </div>
                      <p className="text-xs text-slate-400">{formatRelative(t.created_at)}</p>
                    </td>
                    <td className="py-3 pr-3 text-slate-600">{authorName}</td>
                    <td className="py-3 pr-3">{t.reply_count}</td>
                    <td className="py-3 pr-3">
                      <div className="flex gap-1">
                        {t.is_pinned && <Badge variant="warning">Pinned</Badge>}
                        {t.is_locked && <Badge variant="default">Locked</Badge>}
                        {!t.is_pinned && !t.is_locked && <Badge variant="success">Open</Badge>}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <ForumActions
                        type="thread"
                        id={t.id}
                        isPinned={t.is_pinned}
                        isLocked={t.is_locked}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(threads ?? []).length === 0 && (
            <Card className="mt-4 text-center text-sm text-slate-500">No threads yet.</Card>
          )}
        </div>
      </section>
    </div>
  );
}
