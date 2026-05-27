import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { membershipPlanSchema } from '@/lib/validations/admin';

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return null;
  return user;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const user = await verifyAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = membershipPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const { error } = await supabase.from('membership_plans').insert(parsed.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'create_membership_plan',
    target_type: 'membership_plan',
    metadata: { name: parsed.data.name },
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const user = await verifyAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });

  const { error } = await supabase
    .from('membership_plans')
    .update(updates)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'update_membership_plan',
    target_type: 'membership_plan',
    target_id: id,
    metadata: updates,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const user = await verifyAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });

  const { error } = await supabase
    .from('membership_plans')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'delete_membership_plan',
    target_type: 'membership_plan',
    target_id: id,
  });

  return NextResponse.json({ success: true });
}
