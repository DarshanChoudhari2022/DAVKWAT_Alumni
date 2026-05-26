import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pin, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/shared/Avatar';
import { Pagination } from '@/components/shared/Pagination';
import { createClient } from '@/lib/supabase/server';
import { formatRelative } from '@/lib/utils/format';
import { NewThreadButton } from './NewThreadButton';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}): Promise<Metadata> {
  const { categorySlug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('forum_categories')
    .select('name')
    .eq('slug', categorySlug)
    .single();
  return { title: data?.name ? `${data.name} — Forum` : 'Forum' };
}

const PAGE_SIZE = 20;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { categorySlug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  const { data: category } = await supabase
    .from('forum_categories')
    .select('id, name, description, slug')
    .eq('slug', categorySlug)
    .eq('is_active', true)
    .single();

  if (!category) notFound();

  const { data: threads, count } = await supabase
    .from('forum_threads')
    .select(
      'id, title, is_pinned, is_locked, reply_count, last_reply_at, created_at, author_id, profiles!forum_threads_author_id_fkey(full_name, avatar_url)',
      { count: 'exact' }
    )
    .eq('category_id', category.id)
    .order('is_pinned', { ascending: false })
    .order('last_reply_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/forum"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0F2557]"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        All categories
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{category.name}</h1>
          {category.description && (
            <p className="mt-1 text-sm text-slate-500">{category.description}</p>
          )}
        </div>
        <NewThreadButton categoryId={category.id} categorySlug={category.slug} />
      </header>

      <ul className="mt-6 space-y-2">
        {(threads ?? []).map((thread) => {
          const author = Array.isArray(thread.profiles) ? thread.profiles[0] : thread.profiles;
          return (
            <li key={thread.id}>
              <Link href={`/forum/${categorySlug}/${thread.id}`}>
                <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <Avatar
                      src={author?.avatar_url ?? null}
                      name={author?.full_name ?? 'Unknown'}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {thread.is_pinned && (
                          <Pin aria-label="Pinned" className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        <h3 className="truncate font-medium">{thread.title}</h3>
                        {thread.is_locked && <Badge variant="default">Locked</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>{author?.full_name ?? 'Unknown'}</span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {thread.reply_count ?? 0} replies
                        </span>
                        <span>
                          {thread.last_reply_at
                            ? `Last reply ${formatRelative(thread.last_reply_at)}`
                            : `Created ${formatRelative(thread.created_at)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
        {(threads ?? []).length === 0 && (
          <li>
            <Card className="text-center text-sm text-slate-500">
              No threads yet. Be the first to start a discussion!
            </Card>
          </li>
        )}
      </ul>

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath={`/forum/${categorySlug}`}
        searchParams={{}}
      />
    </div>
  );
}
