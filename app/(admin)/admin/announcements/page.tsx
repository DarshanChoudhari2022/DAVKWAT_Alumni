import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Pin, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/shared/Pagination';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';
import { AnnouncementActions } from './AnnouncementActions';

export const metadata: Metadata = { title: 'Manage Announcements — Admin' };

const PAGE_SIZE = 10;

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase
    .from('announcements')
    .select(
      'id, title, slug, is_pinned, is_published, published_at, created_at, author_id, profiles(full_name)',
      { count: 'exact' }
    );

  if (sp.status === 'published') query = query.eq('is_published', true);
  if (sp.status === 'draft') query = query.eq('is_published', false);

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Announcements</h1>
          <p className="mt-1 text-sm text-slate-500">{count ?? 0} total announcements.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/announcements/new">
            <Plus className="h-4 w-4" />
            New Announcement
          </Link>
        </Button>
      </header>

      {/* Filters */}
      <nav className="mt-6 inline-flex rounded-lg border border-slate-200 bg-white p-1" aria-label="Filter">
        {[
          { label: 'All', value: '' },
          { label: 'Published', value: 'published' },
          { label: 'Drafts', value: 'draft' },
        ].map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/announcements?status=${f.value}` : '/admin/announcements'}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              (sp.status ?? '') === f.value
                ? 'bg-[#0F2557] text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {/* Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2 pr-3">Title</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2 pr-3">Date</th>
              <th className="pb-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((a) => {
              const authorName =
                a.profiles && !Array.isArray(a.profiles)
                  ? (a.profiles as { full_name: string }).full_name
                  : 'Unknown';
              return (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      {a.is_pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{a.title}</p>
                        <p className="text-xs text-slate-400">by {authorName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    {a.is_published ? (
                      <Badge variant="success">
                        <Eye className="mr-1 h-3 w-3" />Published
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        <EyeOff className="mr-1 h-3 w-3" />Draft
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-slate-500">
                    {a.published_at ? formatDate(a.published_at) : formatDate(a.created_at)}
                  </td>
                  <td className="py-3 text-right">
                    <AnnouncementActions
                      id={a.id}
                      isPublished={a.is_published}
                      isPinned={a.is_pinned}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(data ?? []).length === 0 && (
          <Card className="mt-4 text-center text-sm text-slate-500">
            No announcements found.
          </Card>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/admin/announcements"
        searchParams={{ status: sp.status }}
      />
    </div>
  );
}
