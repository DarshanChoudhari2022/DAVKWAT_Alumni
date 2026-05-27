import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'About the Trust' };

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <Badge variant="primary">Registered Educational Trust · Bihar</Badge>
      <h1 className="mt-4 font-sans text-3xl font-bold tracking-[-0.025em] text-slate-950 sm:text-4xl lg:text-[44px]">
        DAV Khagaul Alumni Welfare Trust
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">
        DAVKAWT is the official alumni welfare trust for DAV Khagaul alumni, created to
        preserve lifelong bonds, support students and alumni, and strengthen the institution
        that shaped generations.
      </p>
      <div className="prose-davkawt mt-10">
        <h2>Our mission</h2>
        <p>
          To build a verified, trusted, and active alumni network that connects DAV Khagaul
          graduates across India and abroad while advancing mentorship, welfare, education,
          and community service.
        </p>
        <h2>What the portal enables</h2>
        <ul>
          <li>A verified alumni directory with privacy-aware contact controls.</li>
          <li>Official Trust announcements, circulars, and event updates.</li>
          <li>Reunions, webinars, RSVP workflows, and batch coordination.</li>
          <li>Member forums for mentorship, career guidance, and alumni discussions.</li>
          <li>Membership plans, payment records, receipts, and admin reporting.</li>
        </ul>
        <h2>Why it matters</h2>
        <p>
          The portal gives DAVKAWT a professional, secure, and mobile-first digital presence
          so alumni can reconnect with confidence, contribute transparently, and help future
          generations benefit from a stronger DAV Khagaul community.
        </p>
      </div>
    </article>
  );
}
