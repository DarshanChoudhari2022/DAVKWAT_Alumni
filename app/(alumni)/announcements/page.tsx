import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Pin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CardSkeleton } from '@/components/shared/Skeleton';
import { SectionError } from '@/components/shared/SectionError';
import { Pagination } from '@/components/shared/Pagination';
import { formatCount } from '@/lib/db/count-format';
import { computePagination } from '@/lib/db/pagination';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';
import { stripHtml } from '@/lib/utils/sanitize';

export const metadata: Metadata = { title: 'Announcements' };

const PAGE_SIZE = 15;

/**
 * Skeleton fallback for the announcements list region.
 * Reuses existing CardSkeleton components (Req 2.3).
 */
function AnnouncementsListSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <CardSkeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

/**
 * Shell renders synchronously (Req 2.1, 2.2): heading only.
 * The list streams inside the Suspense boundary below so a slow/failed
 * query never blocks the shell.
 */
export default function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Announcements</h1>
        <p className="mt-1 text-sm text-slate-500">News and updates from the Trust.</p>
      </header>

      <Suspense fallback={<AnnouncementsListSkeleton />}>
        <AnnouncementsListRegion searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/**
 * Async list region (Req 2.2, 2.4, 2.5, 2.6): runs the filtered list query
 * and the estimated row count concurrently via Promise.all, computes reachable
 * pagination, and renders the announcement cards + pagination.
 *
 * Deterministic ordering: is_pinned DESC, published_at DESC, id DESC (Req 5.1).
 * Scoped error handling: on failure, renders SectionError (shell preserved).
 */
async function AnnouncementsListRegion({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  try {
    const sp = await searchParams;
    const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;
    const now = new Date().toISOString();

    // Memoized auth — single-flight per request (Req 1.1, 1.2)
    const supabase = await createClient();

    // List query without count:'exact' — count resolved separately (Req 4.1)
    const listQuery = supabase
      .from('announcements')
      .select(
        'id, title, slug, content, is_pinned, published_at, scheduled_for, cover_image_url',
        { count: 'estimated' }
      )
      .eq('is_published', true)
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const listResult = await listQuery;
    if (listResult.error) throw listResult.error;

    const data = listResult.data ?? [];
    const countResult = { count: listResult.count ?? data.length, isEstimated: true };

    // Pagination reachability under estimated counts (Req 4.2)
    const { totalPages } = computePagination({
      rowsReturned: data.length,
      pageSize: PAGE_SIZE,
      page,
      estimate: countResult.count,
    });

    return (
      <>
        <p className="mt-6 text-sm text-slate-500">
          {formatCount(countResult)} announcements.
        </p>

        <ul className="mt-4 space-y-3">
          {data.map((a) => (
            <li key={a.id}>
              <Link href={`/announcements/${a.slug}`}>
                <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    {a.is_pinned && (
                      <Pin aria-label="Pinned" className="mt-1 h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {a.published_at ? formatDate(a.published_at) : 'Draft'}
                        </span>
                      </div>
                      <h2 className="mt-1.5 font-display text-lg font-semibold">{a.title}</h2>
                      {a.cover_image_url && (
                        <p className="mt-1 text-xs text-slate-400">Cover image attached</p>
                      )}
                      {a.content && (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                          {stripHtml(a.content).slice(0, 200)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
          {data.length === 0 && (
            <li><Card className="text-sm text-slate-500">No announcements yet.</Card></li>
          )}
        </ul>

        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/announcements"
          searchParams={{}}
        />
      </>
    );
  } catch {
    return <SectionError />;
  }
}
