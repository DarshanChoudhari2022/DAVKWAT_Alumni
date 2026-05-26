import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { supabase: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { supabase, error: null };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, error } = await assertAdmin();
  if (error || !supabase) return error;

  const { id } = await params;
  const body = await req.json();

  const allowed: Record<string, unknown> = {};
  if (typeof body.is_published === 'boolean') {
    allowed.is_published = body.is_published;
    if (body.is_published) allowed.published_at = new Date().toISOString();
  }
  if (typeof body.is_pinned === 'boolean') allowed.is_pinned = body.is_pinned;
  if (typeof body.title === 'string') allowed.title = body.title;
  if (typeof body.content === 'string') allowed.content = body.content;
  if (typeof body.category === 'string') allowed.category = body.category;
  if (typeof body.excerpt === 'string') allowed.excerpt = body.excerpt;
  if (typeof body.cover_image_url === 'string') allowed.cover_image_url = body.cover_image_url;

  allowed.updated_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('announcements')
    .update(allowed)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, error } = await assertAdmin();
  if (error || !supabase) return error;

  const { id } = await params;

  const { error: deleteError } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
