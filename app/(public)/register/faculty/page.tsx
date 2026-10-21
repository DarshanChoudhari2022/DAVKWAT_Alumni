import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { FacultyRegisterForm } from './FacultyRegisterForm';
import { requireRegistrationEnabled } from '@/lib/registration-guard';

export const metadata: Metadata = { title: 'Faculty Registration' };

export default function FacultyRegisterPage() {
  requireRegistrationEnabled();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
          Faculty verification
        </p>
        <h1 className="mt-2 font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl">
          Register as DAVKAWT Faculty
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Share which subject you taught at DAV Khagaul and the years you served.
        </p>
      </div>
      <Card className="mt-8 p-6 sm:p-10">
        <FacultyRegisterForm />
      </Card>
      <p className="mt-6 text-center text-sm text-slate-600">
        Registering as alumni instead?{' '}
        <Link href="/register" className="font-medium text-[#0F2557] hover:underline">
          Use alumni registration
        </Link>
      </p>
    </div>
  );
}
