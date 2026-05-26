import { Reveal } from './Reveal';

export function QuoteGlow() {
  return (
    <section className="relative overflow-hidden bg-white py-24">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_50%_55%_at_50%_50%,rgba(99,102,241,0.12),transparent_70%)]" />
      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-10 shadow-xl shadow-indigo-500/10 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/20 sm:p-14">
            <div aria-hidden className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(600px_circle_at_50%_0%,rgba(99,102,241,0.16),transparent_45%)]" />
            <div aria-hidden className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
            <blockquote className="relative font-sans text-2xl font-medium leading-relaxed text-slate-900 sm:text-4xl">
              &ldquo;When alumni stay connected with purpose, every batch becomes stronger and every future student inherits a wider circle of support.&rdquo;
            </blockquote>
            <p className="relative mt-7 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              DAVKAWT Trust
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
