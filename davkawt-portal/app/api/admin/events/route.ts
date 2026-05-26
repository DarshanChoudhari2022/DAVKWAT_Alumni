import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
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
  const { title, description, event_type, venue, online_link, starts_at, ends_at, max_attendees, is_published, slug } = body;

  if (!title?.trim() || !starts_at || !slug) {
    return NextResponse.json({ error: 'Title, start date, and slug are required.' }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('events')
    .insert({
      title: title.trim(),
      description: description?.trim() ?? null,
      slug,
      event_type: event_type ?? 'in_person',
      venue: venue?.trim() ?? null,
      online_link: online_link?.trim() ?? null,
      starts_at,
      ends_at: ends_at ?? null,
      max_attendees: max_attendees ?? null,
      is_published: !!is_published,
      created_by: user.id,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
