import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/audit';
import { toggleActiveSchema } from '@/lib/validations/admin';

export async function POST(req: NextRequest) {
  const { adminAccess, error: authError } = await requireAdminApiAccess();
  if (authError || !adminAccess) return authError;

  const supabase = adminAccess.database;

  const body = await req.json();
  const parsed = toggleActiveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { alumniId, is_active } = parsed.data;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', alumniId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await writeAuditLog({
    actor_id: adminAccess.actorProfileId,
    action: is_active ? 'reactivate_alumni' : 'deactivate_alumni',
    target_type: 'profile',
    target_id: alumniId,
    metadata: { is_active },
  });

  return NextResponse.json({ success: true });
}
