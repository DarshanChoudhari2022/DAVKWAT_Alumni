import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/audit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { adminAccess, error } = await requireAdminApiAccess();
  if (error || !adminAccess) return error;

  const { id } = await params;
  const body = (await req.json()) as { is_deleted?: boolean };

  if (typeof body.is_deleted !== 'boolean') {
    return NextResponse.json({ error: 'is_deleted must be provided.' }, { status: 400 });
  }

  const { error: updateError } = await adminAccess.database
    .from('forum_replies')
    .update({
      is_deleted: body.is_deleted,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await writeAuditLog({
    actor_id: adminAccess.actorProfileId,
    action: body.is_deleted ? 'forum_reply_removed' : 'forum_reply_restored',
    target_type: 'forum_reply',
    target_id: id,
  });

  return NextResponse.json({ success: true });
}
