import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';

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
  if (typeof body.is_active === 'boolean') allowed.is_active = body.is_active;
  if (typeof body.name === 'string') allowed.name = body.name;
  if (typeof body.description === 'string') allowed.description = body.description;
  if (typeof body.display_order === 'number') allowed.display_order = body.display_order;

  const { error: updateError } = await supabase.from('forum_categories').update(allowed).eq('id', id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authError, supabase } = await assertAdmin();
  if (!supabase) return authError ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const { error: deleteError } = await supabase.from('forum_categories').delete().eq('id', id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
