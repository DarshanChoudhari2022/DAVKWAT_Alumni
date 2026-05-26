import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { title, content, is_pinned, slug, cover_image_url } = body;

  if (!title?.trim() || !content?.trim() || !slug) {
    return NextResponse.json({ error: 'Title, content, and slug are required.' }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title: title.trim(),
      content: content.trim(),
      slug,
      is_pinned: !!is_pinned,
      is_published: false,
      author_id: user.id,
      cover_image_url: cover_image_url ?? null,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
