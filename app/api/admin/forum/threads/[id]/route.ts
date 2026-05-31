import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/audit';

async function assertAdmin() {
  const { adminAccess, error: authError } = await requireAdminApiAccess();
  return { adminAccess, authError, supabase: adminAccess?.database ?? null };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { adminAccess, authError, supabase } = await assertAdmin();
  if (!supabase) return authError ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();

  const allowed: {
    title?: string;
    content?: string;
    is_pinned?: boolean;
    is_locked?: boolean;
  } = {};
  if (typeof body.title === 'string' && body.title.trim().length > 0) {
    allowed.title = body.title.trim();
  }
  if (typeof body.content === 'string' && body.content.trim().length > 0) {
    allowed.content = body.content.trim();
  }
  if (typeof body.is_pinned === 'boolean') allowed.is_pinned = body.is_pinned;
  if (typeof body.is_locked === 'boolean') allowed.is_locked = body.is_locked;

  const { error: updateError } = await supabase.from('forum_threads').update(allowed).eq('id', id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await writeAuditLog({
    actor_id: adminAccess?.actorProfileId ?? null,
    action: 'forum_thread_updated',
    target_type: 'forum_thread',
    target_id: id,
    metadata: allowed,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { adminAccess, authError, supabase } = await assertAdmin();
  if (!supabase) return authError ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { error: deleteError } = await supabase.from('forum_threads').delete().eq('id', id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  await writeAuditLog({
    actor_id: adminAccess?.actorProfileId ?? null,
    action: 'forum_thread_deleted',
    target_type: 'forum_thread',
    target_id: id,
  });

  return NextResponse.json({ ok: true });
}
