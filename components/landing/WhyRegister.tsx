import {
  Users,
  CalendarHeart,
  BellRing,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
} from 'lucide-react';
import { Reveal } from './Reveal';

const BENEFITS = [
  {
    icon: Users,
    title: 'Find your batch again',
    desc: 'Search by batch year, course, city, and profession to reconnect with classmates and teachers you may have lost touch with.',
  },
  {
    icon: CalendarHeart,
    title: 'Never miss a reunion',
    desc: 'Get invitations to reunions, silver jubilees, and city chapter meets as soon as the Trust announces them.',
  },
  {
    icon: BellRing,
    title: 'Official updates, direct to you',
    desc: 'Receive Trust circulars, welfare initiatives, and community news from the source — not through forwarded messages.',
  },
  {
    icon: GraduationCap,
    title: 'Mentorship and careers',
    desc: 'Offer guidance to juniors, or find seniors and peers in your field who are glad to help the next generation of DAV Khagaul.',
  },
  {
    icon: ShieldCheck,
    title: 'Lifelong, verified connections',
    desc: 'Your membership keeps you part of a maintained, committee-verified network — so classmates can still find you years from now.',
  },
  {
    icon: HeartHandshake,
    title: 'Your contribution gives back',
    desc: 'Part of your membership directly supports welfare initiatives for current students and alumni — so reconnecting also means giving back.',
  },
];

export function WhyRegister() {
  return (
    <section className="relative bg-white py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-sans text-3xl font-bold tracking-[-0.025em] text-slate-900 sm:text-4xl lg:text-[42px]">
              Why join the alumni network
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
              Registering takes a few minutes and keeps you connected to the people
              and updates that matter — for years to come.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={(i % 3) * 90}>
              <div className="h-full rounded-3xl border border-slate-200 bg-slate-50/60 p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F2557]/5 text-[#0F2557]">
                  <b.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">{b.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
