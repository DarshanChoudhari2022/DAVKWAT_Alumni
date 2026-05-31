import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminActorProfileErrorResponse,
  requireAdminApiAccess,
} from '@/lib/auth/admin-api';

export async function POST(req: NextRequest) {
  const { adminAccess, error: authError } = await requireAdminApiAccess();
  if (authError || !adminAccess) return authError;
  if (!adminAccess.actorProfileId) return getAdminActorProfileErrorResponse();

  const supabase = adminAccess.database;

  const body = await req.json();
  const {
    title,
    description,
    event_type,
    venue,
    online_link,
    banner_image_url,
    starts_at,
    ends_at,
    registration_deadline,
    max_attendees,
    is_published,
    slug,
  } = body;

  if (!title?.trim() || !starts_at || !slug) {
    return NextResponse.json({ error: 'Title, start date, and slug are required.' }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data, error: insertError } = await supabase
    .from('events')
    .insert({
      title: title.trim(),
      description: description?.trim() ?? null,
      slug,
      event_type: event_type ?? 'in_person',
      venue: venue?.trim() ?? null,
      online_link: online_link?.trim() ?? null,
      banner_image_url: banner_image_url?.trim() ?? null,
      starts_at,
      ends_at: ends_at ?? null,
      registration_deadline: registration_deadline ?? null,
      max_attendees: max_attendees ?? null,
      is_published: !!is_published,
      created_by: adminAccess.actorProfileId,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (insertError || !data) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Failed to create event.' },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, id: data.id });
}
