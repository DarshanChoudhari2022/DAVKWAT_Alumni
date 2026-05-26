'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

interface PostReplyInput {
  threadId: string;
  content: string;
}

export async function postReply(input: PostReplyInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  if (!input.content.trim() || input.content.length > 2000) {
    return { error: 'Reply must be between 1 and 2000 characters.' };
  }

  // Check thread is not locked
  const { data: thread } = await supabase
    .from('forum_threads')
    .select('id, is_locked, category_id')
    .eq('id', input.threadId)
    .single();

  if (!thread) return { error: 'Thread not found.' };
  if (thread.is_locked) return { error: 'This thread is locked.' };

  const { error: insertError } = await supabase.from('forum_replies').insert({
    thread_id: input.threadId,
    author_id: user.id,
    content: input.content.trim(),
  });

  if (insertError) return { error: insertError.message };

  // Get current reply count then update
  const { data: currentThread } = await supabase
    .from('forum_threads')
    .select('reply_count')
    .eq('id', input.threadId)
    .single();

  await supabase
    .from('forum_threads')
    .update({
      reply_count: (currentThread?.reply_count ?? 0) + 1,
      last_reply_at: new Date().toISOString(),
    })
    .eq('id', input.threadId);

  revalidatePath('/forum');
  return { success: true };
}
