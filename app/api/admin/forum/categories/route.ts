import { NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';

export async function POST(req: Request) {
  try {
    const { adminAccess, error: authError } = await requireAdminApiAccess();
    if (authError || !adminAccess) return authError;

    const supabase = adminAccess.database;

    const body = await req.json();
    const { name, description, slug, display_order } = body as {
      name: string;
      description: string | null;
      slug: string;
      display_order: number;
    };

    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: 'Name and slug are required.' }, { status: 400 });
    }

    const { error: insertError } = await supabase.from('forum_categories').insert({
      name: name.trim(),
      description: description?.trim() || null,
      slug: slug.trim(),
      display_order: display_order ?? 0,
      created_by: adminAccess.actorProfileId,
      is_active: true,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'A category with this slug already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('Create category error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
