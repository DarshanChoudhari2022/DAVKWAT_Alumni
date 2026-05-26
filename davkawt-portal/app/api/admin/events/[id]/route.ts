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
  if (typeof body.is_published === 'boolean') allowed.is_published = body.is_published;
  if (typeof body.title === 'string') allowed.title = body.title;
  if (typeof body.description === 'string') allowed.description = body.description;
  if (typeof body.event_type === 'string') allowed.event_type = body.event_type;
  if (typeof body.venue === 'string') allowed.venue = body.venue;
  if (typeof body.online_url === 'string') allowed.online_url = body.online_url;
  if (body.starts_at) allowed.starts_at = body.starts_at;
  if (body.ends_at !== undefined) allowed.ends_at = body.ends_at;
  if (body.capacity !== undefined) allowed.capacity = body.capacity;

  allowed.updated_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('events')
    .update(allowed)
    .eq('id', id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, error } = await assertAdmin();
  if (error || !supabase) return error;

  const { id } = await params;

  const { error: deleteError } = await supabase.from('events').delete().eq('id', id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
