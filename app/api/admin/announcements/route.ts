import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminActorProfileErrorResponse,
  requireAdminApiAccess,
} from '@/lib/auth/admin-api';
import { sanitizeHtml } from '@/lib/utils/sanitize';

export async function POST(req: NextRequest) {
  const { adminAccess, error: authError } = await requireAdminApiAccess();
  if (authError || !adminAccess) return authError;
  if (!adminAccess.actorProfileId) return getAdminActorProfileErrorResponse();

  const supabase = adminAccess.database;

  const body = await req.json();
  const { title, content, is_pinned, is_published, slug, cover_image_url, scheduled_for } = body;

  if (!title?.trim() || !content?.trim() || !slug) {
    return NextResponse.json({ error: 'Title, content, and slug are required.' }, { status: 400 });
  }

  const sanitizedContent = sanitizeHtml(content.trim());

  const scheduledForValue =
    typeof scheduled_for === 'string' && scheduled_for.trim().length > 0
      ? scheduled_for
      : null;
  const now = new Date().toISOString();
  const publishedAt = is_published
    ? scheduledForValue && new Date(scheduledForValue).getTime() > Date.now()
      ? scheduledForValue
      : now
    : null;

  const { data, error: insertError } = await supabase
    .from('announcements')
    .insert({
      title: title.trim(),
      content: sanitizedContent,
      slug,
      is_pinned: !!is_pinned,
      is_published: !!is_published,
      author_id: adminAccess.actorProfileId,
      cover_image_url: cover_image_url ?? null,
      scheduled_for: scheduledForValue,
      published_at: publishedAt,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (insertError || !data) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Failed to create announcement.' },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, id: data.id });
}
