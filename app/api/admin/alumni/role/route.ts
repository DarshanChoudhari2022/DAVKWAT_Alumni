import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/audit';
import { invalidateAfterAction } from '@/lib/cache/invalidate';
import { changeRoleSchema } from '@/lib/validations/admin';
import { canAssignRole } from '@/lib/auth/role-governance';

export async function POST(req: NextRequest) {
  const { adminAccess, error: authError } = await requireAdminApiAccess();
  if (authError || !adminAccess) return authError;

  const supabase = adminAccess.database;

  const body = await req.json();
  const parsed = changeRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { alumniId, role } = parsed.data;

  if (!canAssignRole({ actorRole: adminAccess.role, requestedRole: role })) {
    return NextResponse.json(
      { error: 'Only super admins can assign admin roles.' },
      { status: 403 }
    );
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', alumniId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await writeAuditLog({
    actor_id: adminAccess.actorProfileId,
    action: 'change_role',
    target_type: 'profile',
    target_id: alumniId,
    metadata: { new_role: role },
  });

  // Role changes alter admin/alumni composition behind the dashboard stats
  // (design Section 4 — alumni edit / membership change).
  invalidateAfterAction('alumni_edit');

  return NextResponse.json({ success: true });
}
