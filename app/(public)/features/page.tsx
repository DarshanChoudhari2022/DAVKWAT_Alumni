import type { Metadata } from 'next';
import { FeatureList } from '@/components/landing/FeatureList';

export const metadata: Metadata = {
  title: 'Member Experience & Features | DAVKAWT',
  description: 'Explore the verified portal features built for DAV Khagaul Alumni Welfare Trust members and administrators.',
};

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="bg-[#0a1130] py-16 text-center text-white relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-20%,#1e3a8a_0%,#0a1130_60%,#070b22_100%)]" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
            DAV Khagaul Alumni Welfare Trust
          </span>
          <h1 className="mt-4 font-sans text-3xl font-black tracking-[-0.03em] sm:text-4xl md:text-5xl">
            Member Experience
          </h1>
          <p className="mt-4 mx-auto max-w-xl text-sm sm:text-base leading-relaxed text-white/70">
            A secure digital platform designed to unite DAV Khagaul alumni batches around professional support, institutional legacy, and welfare.
          </p>
        </div>
      </div>
      
      <FeatureList />
    </main>
  );
}
