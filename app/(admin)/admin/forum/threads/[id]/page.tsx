import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Lock, Pin } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/shared/Avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { requireAdminAccess } from '@/lib/auth/admin-access';
import { formatDateTime, formatRelative } from '@/lib/utils/format';
import { ReplyModerationButton } from './ReplyModerationButton';
import { ThreadModerationForm } from './ThreadModerationForm';

export const metadata: Metadata = { title: 'Forum Thread Moderation - Admin' };

export default async function AdminForumThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { database: supabase } = await requireAdminAccess();

  const [{ data: thread }, { data: replies }] = await Promise.all([
    supabase
      .from('forum_threads')
      .select(
        'id, title, content, is_pinned, is_locked, created_at, reply_count, profiles!forum_threads_author_id_fkey(full_name, avatar_url), forum_categories(name, slug)'
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('forum_replies')
      .select(
        'id, content, is_deleted, created_at, profiles!forum_replies_author_id_fkey(full_name, avatar_url, batch_year)'
      )
      .eq('thread_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (!thread) {
    notFound();
  }

  const author =
    thread.profiles && !Array.isArray(thread.profiles) ? thread.profiles : null;
  const category =
    thread.forum_categories && !Array.isArray(thread.forum_categories) ? thread.forum_categories : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/admin/forum" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0F2557]">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Forum Management
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          {category && <Badge variant="default">{category.name}</Badge>}
          {thread.is_pinned && (
            <Badge variant="warning" className="gap-1">
              <Pin className="h-3 w-3" />
              Pinned
            </Badge>
          )}
          {thread.is_locked && (
            <Badge variant="default" className="gap-1">
              <Lock className="h-3 w-3" />
              Locked
            </Badge>
          )}
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">{thread.title}</h1>
        <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
          <Avatar src={author?.avatar_url ?? null} name={author?.full_name ?? 'Unknown'} size="sm" />
          <span>{author?.full_name ?? 'Unknown'}</span>
          <span>{formatDateTime(thread.created_at)}</span>
          <span>{thread.reply_count} replies</span>
        </div>
      </header>

      <section className="mt-8">
        <ThreadModerationForm
          thread={{
            id: thread.id,
            title: thread.title,
            content: thread.content,
            is_pinned: thread.is_pinned,
            is_locked: thread.is_locked,
          }}
        />
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Replies</h2>
        <ul className="mt-4 space-y-3">
          {(replies ?? []).map((reply) => {
            const replyAuthor =
              reply.profiles && !Array.isArray(reply.profiles) ? reply.profiles : null;
            return (
              <li key={reply.id}>
                <Card>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={replyAuthor?.avatar_url ?? null}
                          name={replyAuthor?.full_name ?? 'Unknown'}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-medium">{replyAuthor?.full_name ?? 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{formatRelative(reply.created_at)}</p>
                        </div>
                      </div>
                      <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                        {reply.is_deleted ? '[This reply has been removed by a moderator.]' : reply.content}
                      </div>
                    </div>
                    <ReplyModerationButton replyId={reply.id} isDeleted={reply.is_deleted} />
                  </div>
                </Card>
              </li>
            );
          })}
          {(replies ?? []).length === 0 && (
            <li>
              <Card className="text-center text-sm text-slate-500">No replies have been posted yet.</Card>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
