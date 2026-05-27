import { Reveal } from './Reveal';
import { UserPlus, ShieldCheck, LogIn } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    header: 'Complete Registration Form',
    detail: 'Fill in your batch details, graduation year, and contact details in under 3 minutes.',
  },
  {
    icon: ShieldCheck,
    header: 'Trust Committee Review',
    detail: 'Our executive committee validates your profile against school records to keep the network alumni-only.',
  },
  {
    icon: LogIn,
    header: 'Connect & Participate',
    detail: 'Log in to explore the directory, join batch discussions, view circulars, and support welfare programs.',
  },
];

export function MemberJourney() {
  return (
    <section className="bg-[#070b22] py-16 text-white md:py-24 relative overflow-hidden">
      <div aria-hidden className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[100px]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl lg:text-[42px]">
              How to join the Trust network.
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-white/60">
              A private, secure platform vetted and approved by the DAVKAWT executive committee.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {steps.map((step, index) => (
            <Reveal key={step.header} delay={index * 150}>
              <div className="relative flex flex-col items-center text-center">
                {index !== steps.length - 1 && (
                  <div
                    className="absolute left-[60%] top-[30px] hidden w-[80%] border-t border-dashed border-white/20 md:block"
                    aria-hidden="true"
                  />
                )}
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 shadow-lg shadow-indigo-500/10 border border-white/10 backdrop-blur-md">
                  <step.icon className="h-7 w-7 text-indigo-400" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">{step.header}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/60 px-4">
                  {step.detail}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
