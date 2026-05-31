import { createStaticClient } from '@/lib/supabase/static';
import { Hero } from '@/components/landing/Hero';
import { FeatureTabs } from '@/components/landing/FeatureTabs';
import { Showcase } from '@/components/landing/Showcase';
import { MemberJourney } from '@/components/landing/MemberJourney';
import { FeatureList } from '@/components/landing/FeatureList';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { ManageEngage } from '@/components/landing/ManageEngage';
import { Reveal } from '@/components/landing/Reveal';

export const revalidate = 300; // 5 min ISR for the landing page

async function getLandingData() {
  const supabase = createStaticClient();
  const now = new Date().toISOString();

  // During CI builds, env vars may be missing — return empty defaults
  if (!supabase) {
    return { events: [], announcements: [], alumniCount: 0 };
  }

  const [eventsRes, announcementsRes, statsRes] = await Promise.all([
    supabase
      .from('events')
      .select('id, title, slug, banner_image_url, starts_at, venue, event_type')
      .eq('is_published', true)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(4),
    supabase
      .from('announcements')
      .select('id, title, slug, cover_image_url, published_at')
      .eq('is_published', true)
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(4),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'approved')
      .eq('is_active', true),
  ]);

  return {
    events: eventsRes.data ?? [],
    announcements: announcementsRes.data ?? [],
    alumniCount: statsRes.count ?? 0,
  };
}

export default async function HomePage() {
  const { events, announcements, alumniCount } = await getLandingData();

  return (
    <>
      <Hero alumniCount={alumniCount} />

      <Showcase events={events} announcements={announcements} />

      <MemberJourney />

      <ManageEngage />

      <FeatureTabs />

      <div className="hidden lg:block">
        <FeatureList />
      </div>

      <div className="lg:hidden relative overflow-hidden bg-slate-50 py-16 text-center border-y border-slate-100">
        <div aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-indigo-100/40 blur-3xl" />
        <div className="relative mx-auto max-w-md px-4">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-amber-600">
            Member experience
          </span>
          <h3 className="mt-3 font-sans text-2xl font-black text-slate-950 tracking-tight">
            Explore portal features
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Discover how DAVKAWT enables verified directories, protected forums, event tracking, and membership administration.
          </p>
          <a
            href="/features"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0F2557] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-950/10 transition hover:bg-indigo-800"
          >
            See member experience
          </a>
        </div>
      </div>

      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <blockquote className="font-sans text-xl font-medium leading-relaxed text-slate-900 sm:text-2xl md:text-[28px]">
              &ldquo;Strategies and stories on building lifelong alumni connections —
              when every batch stays engaged, the entire DAV Khagaul community grows stronger.&rdquo;
            </blockquote>
            <p className="mt-6 text-sm font-medium uppercase tracking-wider text-slate-500">
              — DAV Khagaul Alumni Welfare Trust
            </p>
          </Reveal>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
