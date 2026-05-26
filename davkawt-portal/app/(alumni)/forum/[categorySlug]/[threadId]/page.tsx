import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Pin, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/shared/Avatar';
import { Pagination } from '@/components/shared/Pagination';
import { createClient } from '@/lib/supabase/server';
import { formatRelative, formatDateTime } from '@/lib/utils/format';
import { ReplyForm } from './ReplyForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; threadId: string }>;
}): Promise<Metadata> {
  const { threadId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('forum_threads')
    .select('title')
    .eq('id', threadId)
    .single();
  return { title: data?.title ? `${data.title} — Forum` : 'Thread' };
}

const REPLIES_PER_PAGE = 20;

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string; threadId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { categorySlug, threadId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const offset = (page - 1) * REPLIES_PER_PAGE;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: thread } = await supabase
    .from('forum_threads')
    .select(
      'id, title, content, is_pinned, is_locked, reply_count, created_at, author_id, profiles!forum_threads_author_id_fkey(full_name, avatar_url, batch_year, course)'
    )
    .eq('id', threadId)
    .single();

  if (!thread) notFound();

  const { data: category } = await supabase
    .from('forum_categories')
    .select('name, slug')
    .eq('slug', categorySlug)
    .single();

  const { data: replies, count: replyCount } = await supabase
    .from('forum_replies')
    .select(
      'id, content, is_deleted, created_at, author_id, profiles!forum_replies_author_id_fkey(full_name, avatar_url, batch_year)',
      { count: 'exact' }
    )
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .range(offset, offset + REPLIES_PER_PAGE - 1);

  const totalPages = Math.max(1, Math.ceil((replyCount ?? 0) / REPLIES_PER_PAGE));
  const threadAuthor = Array.isArray(thread.profiles) ? thread.profiles[0] : thread.profiles;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        <Link href="/forum" className="hover:text-[#0F2557]">Forum</Link>
        <span>/</span>
        <Link href={`/forum/${categorySlug}`} className="hover:text-[#0F2557]">
          {category?.name ?? categorySlug}
        </Link>
      </nav>

      {/* Original post */}
      <Card className="mt-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {thread.is_pinned && (
            <Badge variant="warning" className="gap-1">
              <Pin className="h-3 w-3" /> Pinned
            </Badge>
          )}
          {thread.is_locked && (
            <Badge variant="default" className="gap-1">
              <Lock className="h-3 w-3" /> Locked
            </Badge>
          )}
        </div>

        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {thread.title}
        </h1>

        <div className="mt-4 flex items-center gap-3">
          <Avatar
            src={threadAuthor?.avatar_url ?? null}
            name={threadAuthor?.full_name ?? 'Unknown'}
            size="md"
          />
          <div>
            <p className="text-sm font-medium">{threadAuthor?.full_name ?? 'Unknown'}</p>
            <p className="text-xs text-slate-500">
              {threadAuthor?.batch_year && `Batch ${threadAuthor.batch_year}`}
              {threadAuthor?.course && ` · ${threadAuthor.course}`}
              {' · '}
              {formatDateTime(thread.created_at)}
            </p>
          </div>
        </div>

        <div className="mt-6 whitespace-pre-line text-base leading-relaxed text-slate-700">
          {thread.content}
        </div>
      </Card>

      {/* Replies */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">
          {replyCount ?? 0} {(replyCount ?? 0) === 1 ? 'Reply' : 'Replies'}
        </h2>

        <ul className="mt-4 space-y-3">
          {(replies ?? []).map((reply) => {
            const replyAuthor = Array.isArray(reply.profiles) ? reply.profiles[0] : reply.profiles;
            return (
              <li key={reply.id}>
                <Card className="p-4 sm:p-5">
                  {reply.is_deleted ? (
                    <p className="text-sm italic text-slate-400">[This reply has been removed]</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={replyAuthor?.avatar_url ?? null}
                          name={replyAuthor?.full_name ?? 'Unknown'}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {replyAuthor?.full_name ?? 'Unknown'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatRelative(reply.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                        {reply.content}
                      </div>
                    </>
                  )}
                </Card>
              </li>
            );
          })}
          {(replies ?? []).length === 0 && (
            <li>
              <Card className="text-center text-sm text-slate-500">
                No replies yet. Be the first to respond!
              </Card>
            </li>
          )}
        </ul>

        <Pagination
          page={page}
          totalPages={totalPages}
          basePath={`/forum/${categorySlug}/${threadId}`}
          searchParams={{}}
        />
      </section>

      {/* Reply form */}
      {!thread.is_locked ? (
        <ReplyForm threadId={thread.id} categorySlug={categorySlug} />
      ) : (
        <Card className="mt-6 text-center text-sm text-slate-500">
          This thread is locked. No new replies can be added.
        </Card>
      )}
    </div>
  );
}
