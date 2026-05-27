import { createStaticClient } from '@/lib/supabase/static';
import { Hero } from '@/components/landing/Hero';
import { FeatureTabs } from '@/components/landing/FeatureTabs';
import { Showcase } from '@/components/landing/Showcase';
import { FeatureList } from '@/components/landing/FeatureList';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { ManageEngage } from '@/components/landing/ManageEngage';
import { Reveal } from '@/components/landing/Reveal';

export const revalidate = 300; // 5 min ISR for the landing page

async function getLandingData() {
  const supabase = createStaticClient();

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

      <div className="hidden md:block">
        <ManageEngage />
      </div>

      <div className="hidden lg:block">
        <FeatureTabs />
      </div>

      <Showcase events={events} announcements={announcements} />

      <section className="relative hidden bg-[#070b22] py-24 text-white md:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal direction="left">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-600/20 via-blue-700/10 to-amber-500/10 p-8 backdrop-blur sm:p-10">
                <h3 className="font-sans text-xl font-bold text-amber-300">
                  Why alumni engagement is critical
                </h3>
                <ul className="mt-5 space-y-3 text-[15px] leading-relaxed text-white/70">
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-amber-400" />
                    Strengthens institutional legacy and reputation across decades
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-sky-400" />
                    Creates mentorship pipelines for current students and graduates
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-emerald-400" />
                    Builds professional networks grounded in shared school culture
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-rose-400" />
                    Enables welfare initiatives and community-driven impact at scale
                  </li>
                </ul>
              </div>
            </Reveal>
            <Reveal direction="right" delay={100}>
              <div>
                <h2 className="font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl lg:text-[44px]">
                  What is DAVKAWT?
                </h2>
                <p className="mt-4 text-[17px] leading-relaxed text-white/60">
                  DAVKAWT is the official digital platform of DAV Khagaul Alumni Welfare Trust.
                  It brings verified alumni profiles, Trust announcements, events, forums,
                  membership payments, and admin governance into one secure, mobile-first portal.
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-white/50">
                  Effortlessly keep track of all alumni and send targeted communication —
                  all managed by Trust administrators with transparency and accountability.
                </p>
                <a
                  href="/register"
                  className="mt-8 inline-flex items-center rounded-full border border-white/20 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Register as alumnus
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="hidden bg-[#0a1130] py-24 text-white lg:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="text-center font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl lg:text-[44px]">
              Generations connected by one DAV Khagaul identity
            </h2>
          </Reveal>

          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[
              { name: 'Batch\n1972', g: 'from-rose-400 to-orange-400' },
              { name: 'Batch\n1984', g: 'from-emerald-400 to-teal-400' },
              { name: 'Batch\n1996', g: 'from-sky-400 to-indigo-400' },
              { name: 'Batch\n2003', g: 'from-amber-400 to-yellow-400' },
              { name: 'Batch\n2010', g: 'from-violet-400 to-purple-400' },
              { name: 'Batch\n2018', g: 'from-pink-400 to-rose-400' },
            ].map((b, i) => (
              <Reveal key={b.name} delay={i * 60}>
                <div className="group flex flex-col items-center">
                  <div
                    className={`h-28 w-28 rounded-2xl bg-gradient-to-br ${b.g} shadow-lg transition group-hover:-translate-y-1 group-hover:shadow-xl sm:h-32 sm:w-32`}
                  />
                  <p className="mt-3 whitespace-pre-line text-center text-sm font-semibold leading-tight">
                    {b.name}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="hidden lg:block">
        <FeatureList />
      </div>

      <section className="hidden bg-white py-20 md:block">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <blockquote className="font-sans text-2xl font-medium leading-relaxed text-slate-900 sm:text-[28px]">
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
