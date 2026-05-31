import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/audit';
import { membershipPlanSchema } from '@/lib/validations/admin';

export async function POST(req: NextRequest) {
  const { adminAccess, error: authError } = await requireAdminApiAccess();
  if (authError || !adminAccess) return authError;

  const supabase = adminAccess.database;

  const body = await req.json();
  const parsed = membershipPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const { error: insertError } = await supabase.from('membership_plans').insert(parsed.data);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  await writeAuditLog({
    actor_id: adminAccess.actorProfileId,
    action: 'create_membership_plan',
    target_type: 'membership_plan',
    metadata: { name: parsed.data.name },
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const { adminAccess, error: authError } = await requireAdminApiAccess();
  if (authError || !adminAccess) return authError;

  const supabase = adminAccess.database;

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });

  const { error: updateError } = await supabase
    .from('membership_plans')
    .update(updates)
    .eq('id', id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await writeAuditLog({
    actor_id: adminAccess.actorProfileId,
    action: 'update_membership_plan',
    target_type: 'membership_plan',
    target_id: id,
    metadata: updates,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { adminAccess, error: authError } = await requireAdminApiAccess();
  if (authError || !adminAccess) return authError;

  const supabase = adminAccess.database;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });

  const { error: deleteError } = await supabase
    .from('membership_plans')
    .delete()
    .eq('id', id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  await writeAuditLog({
    actor_id: adminAccess.actorProfileId,
    action: 'delete_membership_plan',
    target_type: 'membership_plan',
    target_id: id,
  });

  return NextResponse.json({ success: true });
}
