import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { sanitizeHtml } from '@/lib/utils/sanitize';

async function assertAdmin() {
  const { adminAccess, error: authError } = await requireAdminApiAccess();
  return { authError, supabase: adminAccess?.database ?? null };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authError, supabase } = await assertAdmin();
  if (!supabase) return authError ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const allowed: Record<string, unknown> = {};
  if (typeof body.is_published === 'boolean') {
    allowed.is_published = body.is_published;
    if (!body.is_published) {
      allowed.published_at = null;
    }
  }
  if (typeof body.is_pinned === 'boolean') allowed.is_pinned = body.is_pinned;
  if (typeof body.title === 'string') allowed.title = body.title;
  if (typeof body.content === 'string') allowed.content = sanitizeHtml(body.content);
  if (typeof body.cover_image_url === 'string') allowed.cover_image_url = body.cover_image_url;
  if (body.cover_image_url === null) allowed.cover_image_url = null;
  if (typeof body.scheduled_for === 'string') allowed.scheduled_for = body.scheduled_for;
  if (body.scheduled_for === null) allowed.scheduled_for = null;

  const nextScheduledFor =
    typeof allowed.scheduled_for === 'string' ? allowed.scheduled_for : body.scheduled_for ?? null;
  if (allowed.is_published === true) {
    allowed.published_at =
      nextScheduledFor && new Date(nextScheduledFor).getTime() > Date.now()
        ? nextScheduledFor
        : new Date().toISOString();
  }

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
  const { authError, supabase } = await assertAdmin();
  if (!supabase) return authError ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
