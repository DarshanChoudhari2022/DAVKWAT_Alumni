import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/audit';
import { changeRoleSchema } from '@/lib/validations/admin';

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

  // Only super_admin can assign super_admin
  if (role === 'super_admin' && adminAccess.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super admins can assign super_admin role.' }, { status: 403 });
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

  return NextResponse.json({ success: true });
}
