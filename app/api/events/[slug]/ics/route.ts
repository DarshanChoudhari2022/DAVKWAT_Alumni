import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildICS } from '@/lib/utils/ics';
import { APP_URL } from '@/lib/resend/client';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, title, description, venue, starts_at, ends_at, slug')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!event) {
    return new NextResponse('Event not found', { status: 404 });
  }

  const location = event.venue ?? null;
  const ics = buildICS({
    uid: event.id,
    title: event.title,
    description: event.description,
    location,
    startsAt: new Date(event.starts_at),
    endsAt: event.ends_at ? new Date(event.ends_at) : null,
    url: `${APP_URL}/events/${event.slug}`,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}.ics"`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
