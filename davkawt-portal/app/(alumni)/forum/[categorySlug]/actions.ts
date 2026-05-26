'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

interface CreateThreadInput {
  categoryId: string;
  title: string;
  content: string;
}

export async function createThread(input: CreateThreadInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  if (!input.title.trim() || input.title.length > 200) {
    return { error: 'Title is required and must be under 200 characters.' };
  }
  if (!input.content.trim() || input.content.length > 5000) {
    return { error: 'Content is required and must be under 5000 characters.' };
  }

  const { error } = await supabase.from('forum_threads').insert({
    category_id: input.categoryId,
    author_id: user.id,
    title: input.title.trim(),
    content: input.content.trim(),
    last_reply_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath('/forum');
  return { success: true };
}
