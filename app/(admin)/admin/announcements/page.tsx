import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Pin, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MobileInfoRow } from '@/components/admin/MobileInfoRow';
import { Pagination } from '@/components/shared/Pagination';
import { requireAdminAccess } from '@/lib/auth/admin-access';
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

  const { database: supabase } = await requireAdminAccess();
  const now = new Date().toISOString();

  let query = supabase
    .from('announcements')
    .select(
      'id, title, slug, is_pinned, is_published, published_at, scheduled_for, created_at, author_id, profiles(full_name)',
      { count: 'exact' }
    );

  if (sp.status === 'published') {
    query = query.eq('is_published', true).or(`scheduled_for.is.null,scheduled_for.lte.${now}`);
  }
  if (sp.status === 'draft') query = query.eq('is_published', false);
  if (sp.status === 'scheduled') {
    query = query.eq('is_published', true).not('scheduled_for', 'is', null).gt('scheduled_for', now);
  }

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Announcements</h1>
          <p className="mt-1 text-sm text-slate-500">{count ?? 0} total announcements.</p>
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href="/admin/announcements/new">
            <Plus className="h-4 w-4" />
            New Announcement
          </Link>
        </Button>
      </header>

      {/* Filters */}
      <nav className="mt-6 flex overflow-x-auto rounded-lg border border-slate-200 bg-white p-1" aria-label="Filter">
        {[
          { label: 'All', value: '' },
          { label: 'Published', value: 'published' },
          { label: 'Scheduled', value: 'scheduled' },
          { label: 'Drafts', value: 'draft' },
        ].map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/announcements?status=${f.value}` : '/admin/announcements'}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${
              (sp.status ?? '') === f.value
                ? 'bg-[#0F2557] text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 grid gap-3 sm:hidden">
        {(data ?? []).map((a) => {
          const authorName =
            a.profiles && !Array.isArray(a.profiles)
              ? (a.profiles as { full_name: string }).full_name
              : 'Unknown';
          const displayDate = a.scheduled_for
            ? formatDate(a.scheduled_for)
            : a.published_at
              ? formatDate(a.published_at)
              : formatDate(a.created_at);
          const status =
            a.is_published && a.scheduled_for && new Date(a.scheduled_for).getTime() > Date.now()
              ? 'Scheduled'
              : a.is_published
                ? 'Published'
                : 'Draft';

          return (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {a.is_pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                    <p className="line-clamp-2 font-medium">{a.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">by {authorName}</p>
                </div>
                {status === 'Scheduled' ? (
                  <Badge variant="warning">Scheduled</Badge>
                ) : status === 'Published' ? (
                  <Badge variant="success">Published</Badge>
                ) : (
                  <Badge variant="warning">Draft</Badge>
                )}
              </div>
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                <MobileInfoRow label="Date">{displayDate}</MobileInfoRow>
                <div className="flex justify-end">
                  <AnnouncementActions id={a.id} isPublished={a.is_published} isPinned={a.is_pinned} />
                </div>
              </div>
            </Card>
          );
        })}
        {(data ?? []).length === 0 && (
          <Card className="text-center text-sm text-slate-500">No announcements found.</Card>
        )}
      </div>

      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white sm:block">
        <table className="w-full min-w-[720px] text-sm">
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
                    {a.is_published && a.scheduled_for && new Date(a.scheduled_for).getTime() > Date.now() ? (
                      <Badge variant="warning">Scheduled</Badge>
                    ) : a.is_published ? (
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
                    {a.scheduled_for ? formatDate(a.scheduled_for) : a.published_at ? formatDate(a.published_at) : formatDate(a.created_at)}
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
