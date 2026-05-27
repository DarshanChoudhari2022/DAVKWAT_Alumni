import type { Metadata } from 'next';
import Link from 'next/link';
import { Pin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/shared/Pagination';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Announcements' };

const PAGE_SIZE = 15;

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const q = supabase
    .from('announcements')
    .select('id, title, slug, content, is_pinned, published_at', { count: 'exact' })
    .eq('is_published', true);

  const { data, count } = await q
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Announcements</h1>
        <p className="mt-1 text-sm text-slate-500">News and updates from the Trust.</p>
      </header>

      <ul className="mt-6 space-y-3">
        {(data ?? []).map((a) => (
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
                    {a.content && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.content.slice(0, 200)}</p>}
                  </div>
                </div>
              </Card>
            </Link>
          </li>
        ))}
        {(data ?? []).length === 0 && (
          <li><Card className="text-sm text-slate-500">No announcements yet.</Card></li>
        )}
      </ul>

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/announcements"
        searchParams={{}}
      />
    </div>
  );
}
