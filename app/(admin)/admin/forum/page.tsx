import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, MessageSquare, Lock, Pin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MobileInfoRow } from '@/components/admin/MobileInfoRow';
import { requireAdminAccess } from '@/lib/auth/admin-access';
import { formatRelative } from '@/lib/utils/format';
import { ForumActions } from './ForumActions';

export const metadata: Metadata = { title: 'Forum Management — Admin' };

export default async function AdminForumPage() {
  const { database: supabase } = await requireAdminAccess();

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
    <div className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Forum Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage categories and moderate threads.</p>
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
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
              <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
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
                <div className="flex justify-end">
                  <ForumActions type="category" id={cat.id} isActive={cat.is_active} />
                </div>
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
        <div className="mt-4 grid gap-3 sm:hidden">
          {(threads ?? []).map((t) => {
            const authorName =
              t.profiles && !Array.isArray(t.profiles)
                ? (t.profiles as { full_name: string }).full_name
                : 'Unknown';
            return (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {t.is_pinned && <Pin className="h-3 w-3 shrink-0 text-amber-500" />}
                      {t.is_locked && <Lock className="h-3 w-3 shrink-0 text-slate-400" />}
                      <Link href={`/admin/forum/threads/${t.id}`} className="line-clamp-2 font-medium hover:text-[#0F2557]">
                        {t.title}
                      </Link>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{formatRelative(t.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {t.is_pinned && <Badge variant="warning">Pinned</Badge>}
                    {t.is_locked && <Badge variant="default">Locked</Badge>}
                    {!t.is_pinned && !t.is_locked && <Badge variant="success">Open</Badge>}
                  </div>
                </div>
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                  <MobileInfoRow label="Author">{authorName}</MobileInfoRow>
                  <MobileInfoRow label="Replies">{t.reply_count}</MobileInfoRow>
                  <div className="flex justify-end">
                    <ForumActions type="thread" id={t.id} isPinned={t.is_pinned} isLocked={t.is_locked} />
                  </div>
                </div>
              </Card>
            );
          })}
          {(threads ?? []).length === 0 && (
            <Card className="text-center text-sm text-slate-500">No threads yet.</Card>
          )}
        </div>

        <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white sm:block">
          <table className="w-full min-w-[760px] text-sm">
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
                        <Link href={`/admin/forum/threads/${t.id}`} className="line-clamp-1 font-medium hover:text-[#0F2557]">
                          {t.title}
                        </Link>
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
        </div>
      </section>
    </div>
  );
}
