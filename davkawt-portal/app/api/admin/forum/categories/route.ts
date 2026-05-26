import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    const { error } = await supabase.from('forum_categories').insert({
      name: name.trim(),
      description: description?.trim() || null,
      slug: slug.trim(),
      display_order: display_order ?? 0,
      created_by: user.id,
      is_active: true,
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A category with this slug already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('Create category error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
