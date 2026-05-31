import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit';
import { createClient } from '@/lib/supabase/server';
import { toggleActiveSchema } from '@/lib/validations/admin';

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
  const parsed = toggleActiveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const { alumniId, is_active } = parsed.data;

  const { error } = await supabase
    .from('profiles')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', alumniId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    actor_id: user.id,
    action: is_active ? 'reactivate_alumni' : 'deactivate_alumni',
    target_type: 'profile',
    target_id: alumniId,
    metadata: { is_active },
  });

  return NextResponse.json({ success: true });
}
