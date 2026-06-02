import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { invalidateAfterAction } from '@/lib/cache/invalidate';
import { revalidateEventContent } from '@/lib/utils/revalidate-content';

async function assertAdmin() {
  const { adminAccess, error: authError } = await requireAdminApiAccess();
  return { authError, supabase: adminAccess?.database ?? null };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authError, supabase } = await assertAdmin();
    if (!supabase) return authError ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();

    const allowed: Record<string, unknown> = {};
    if (typeof body.is_published === 'boolean') allowed.is_published = body.is_published;
    if (typeof body.title === 'string') allowed.title = body.title.trim();
    if (body.description === null || typeof body.description === 'string') {
      allowed.description = body.description?.trim() ?? null;
    }
    if (typeof body.event_type === 'string') allowed.event_type = body.event_type;
    if (body.venue === null || typeof body.venue === 'string') {
      allowed.venue = body.venue?.trim() || null;
    }
    if (body.online_link === null || typeof body.online_link === 'string') {
      allowed.online_link = body.online_link?.trim() || null;
    }
    if (body.banner_image_url === null || typeof body.banner_image_url === 'string') {
      allowed.banner_image_url = body.banner_image_url?.trim() || null;
    }
    if (body.starts_at) allowed.starts_at = body.starts_at;
    if (body.ends_at !== undefined) allowed.ends_at = body.ends_at;
    if (body.registration_deadline !== undefined) {
      allowed.registration_deadline = body.registration_deadline;
    }
    if (body.max_attendees === null || typeof body.max_attendees === 'number') {
      allowed.max_attendees = body.max_attendees;
    }

    allowed.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('events')
      .update(allowed)
      .eq('id', id)
      .select('slug')
      .maybeSingle();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    revalidateEventContent(updated?.slug);
    // The update may toggle is_published, changing the upcoming/published events count
    // feeding the dashboard stats. Refresh the tag-based cache alongside the existing
    // path-based revalidation (Task 19.5 — Req 4.4, 9.1, 9.6).
    invalidateAfterAction('event_publish');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/events] update failed:', error);
    return NextResponse.json({ error: 'Failed to update event.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authError, supabase } = await assertAdmin();
  if (!supabase) return authError ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const { data: deleted, error: deleteError } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .select('slug')
    .maybeSingle();
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  revalidateEventContent(deleted?.slug);
  // Deleting an event changes the upcoming/published events count feeding the
  // dashboard stats. Refresh the tag-based cache alongside the existing path-based
  // revalidation (Task 19.5 — Req 4.4, 9.1, 9.6).
  invalidateAfterAction('event_publish');
  return NextResponse.json({ ok: true });
}
