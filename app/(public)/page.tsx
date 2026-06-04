import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createStaticClient } from '@/lib/supabase/static';
import { Hero } from '@/components/landing/Hero';
import { TrustBand } from '@/components/landing/TrustBand';
import { WhyRegister } from '@/components/landing/WhyRegister';
import { MembershipTeaser } from '@/components/landing/MembershipTeaser';
import { Showcase } from '@/components/landing/Showcase';
import { LiveUpdatesRefresh } from '@/components/landing/LiveUpdatesRefresh';
import { ManageEngage } from '@/components/landing/ManageEngage';
import { PrivacyData } from '@/components/landing/PrivacyData';
import { FinalCTA } from '@/components/landing/FinalCTA';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function createLandingDataClient(): SupabaseClient<Database> | null {
  if (
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== 'PASTE_SERVICE_ROLE_KEY_HERE'
  ) {
    try {
      return createAdminClient();
    } catch {
      return createStaticClient();
    }
  }

  return createStaticClient();
}

async function getLandingData() {
  const supabase = createLandingDataClient();
  const now = new Date().toISOString();

  // During CI builds, env vars may be missing — return empty defaults
  if (!supabase) {
    return { events: [], announcements: [], alumniCount: 0 };
  }

  const [eventsRes, announcementsRes, statsRes] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, slug, banner_image_url, starts_at, venue, event_type, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('announcements')
      .select('id, title, slug, cover_image_url, published_at, created_at')
      .eq('is_published', true)
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.rpc('get_public_alumni_count'),
  ]);

  return {
    events: eventsRes.data ?? [],
    announcements: announcementsRes.data ?? [],
    alumniCount: Number(statsRes.data ?? 0),
  };
}

export default async function HomePage() {
  const { events, announcements, alumniCount } = await getLandingData();

  return (
    <>
      <LiveUpdatesRefresh />

      <Hero alumniCount={alumniCount} />

      <TrustBand />

      <WhyRegister />

      <MembershipTeaser />

      <Showcase events={events} announcements={announcements} />

      <ManageEngage />

      <PrivacyData />

      <FinalCTA />
    </>
  );
}
