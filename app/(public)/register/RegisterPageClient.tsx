'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { RegisterForm } from './RegisterForm';

export function RegisterPageClient() {
  const [step, setStep] = useState(0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl">
          Register for DAVKAWT verification
        </h1>
        {step === 0 && (
          <p className="mt-2 text-sm text-slate-600">
            Choose the correct registration type so the Trust can verify your DAV
            Khagaul connection accurately.
          </p>
        )}
      </div>
      {step === 0 && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border-2 border-[#0F2557] bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-[#0F2557]">Register as Alumni</p>
            <p className="mt-1 text-xs text-slate-600">
              For former students: 10th, 12th, or left before completing 10th.
            </p>
          </div>
          <Link
            href="/register/faculty"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#0F2557] hover:bg-slate-50"
          >
            <p className="text-sm font-semibold text-slate-900">Register as Faculty</p>
            <p className="mt-1 text-xs text-slate-600">
              For teachers: subject taught and teaching years at DAV Khagaul.
            </p>
          </Link>
        </div>
      )}
      <Card className="mt-8 p-6 sm:p-10">
        <RegisterForm step={step} setStep={setStep} />
      </Card>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-[#0F2557] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
