import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { changeRoleSchema } from '@/lib/validations/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify admin
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!adminProfile || !['admin', 'super_admin'].includes(adminProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = changeRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { alumniId, role } = parsed.data;

  // Only super_admin can assign super_admin
  if (role === 'super_admin' && adminProfile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super admins can assign super_admin role.' }, { status: 403 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', alumniId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'change_role',
    target_type: 'profile',
    target_id: alumniId,
    metadata: { new_role: role },
  });

  return NextResponse.json({ success: true });
}
