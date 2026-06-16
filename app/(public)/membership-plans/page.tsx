import type { Metadata } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createStaticClient } from '@/lib/supabase/static';
import { MembershipSection } from '@/components/landing/MembershipSection';
import { MemberJourney } from '@/components/landing/MemberJourney';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Membership & Fee | DAVKAWT',
  description:
    'How membership works and what your contribution supports at the DAV Khagaul Alumni Welfare Trust. Reviewed by the Trust committee and privacy-first.',
};

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

async function getPlans() {
  const supabase = createLandingDataClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from('membership_plans')
    .select('id, name, description, amount, membership_type, duration_months')
    .eq('is_active', true)
    .order('amount', { ascending: true });

  return data ?? [];
}

export default async function MembershipPlansPage() {
  const plans = await getPlans();

  return (
    <>
      {/* Page header */}
      <section className="relative overflow-hidden bg-[#0a1130] py-14 text-center text-white md:py-20">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-20%,#1e3a8a_0%,#0a1130_60%,#070b22_100%)]"
        />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
            DAV Khagaul Alumni Welfare Trust
          </span>
          <h1 className="mt-4 font-sans text-3xl font-black tracking-[-0.03em] sm:text-4xl md:text-5xl">
            Membership &amp; Fee
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            How membership works, what your contribution supports, and the plans
            available — all in one place.
          </p>
        </div>
      </section>

      <MemberJourney />

      <MembershipSection plans={plans} />
    </>
  );
}
