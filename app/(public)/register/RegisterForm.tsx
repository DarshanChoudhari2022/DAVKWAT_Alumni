'use client';

import { useActionState, useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/FieldError';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { cn } from '@/lib/utils/cn';
import { registerAction, type RegisterState } from './actions';

const initialState: RegisterState = {};
const CURRENT_YEAR = new Date().getFullYear();
const BATCH_YEARS = Array.from({ length: CURRENT_YEAR - 1959 }, (_, i) => CURRENT_YEAR - i);
const STEPS = ['Account', 'Academic', 'Personal', 'Professional'] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" disabled={pending}>
      {pending ? 'Submitting…' : 'Submit registration'}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);
  const [step, setStep] = useState(0);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  /** Validate all visible inputs in the current step div */
  function validateCurrentStep(): boolean {
    const stepDiv = document.getElementById(`step-${step}`);
    if (!stepDiv) return true;

    const errors: Record<string, string> = {};
    const inputs = stepDiv.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, select, textarea'
    );

    for (const input of Array.from(inputs)) {
      if (!input.checkValidity()) {
        const name = input.name || input.id;
        errors[name] = input.validationMessage;
      }
    }

    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function next() {
    if (!validateCurrentStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setClientErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit(fd: FormData) {
    // Validate Step 4 fields before sending to server
    if (!validateCurrentStep()) return;
    formAction(fd);
  }

  // Merge server errors with client errors
  const fieldErrors = { ...clientErrors, ...state.fieldErrors };

  return (
    <form ref={formRef} action={handleSubmit} noValidate className="space-y-6">
      {/* Progress */}
      <ol className="flex items-center justify-between" aria-label="Registration progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                i <= step ? 'bg-[#0F2557] text-white' : 'bg-slate-200 text-slate-500'
              )}
              aria-current={i === step ? 'step' : undefined}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 flex-1 transition-colors',
                  i < step ? 'bg-[#0F2557]' : 'bg-slate-200'
                )}
                aria-hidden
              />
            )}
          </li>
        ))}
      </ol>
      <p className="text-center text-sm font-medium text-slate-600">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>

      {state.error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      {/* Step 1 — Account */}
      <div id="step-0" className={cn('space-y-4', step !== 0 && 'hidden')}>
        <Field label="Email" name="email" type="email" autoComplete="email" required error={fieldErrors?.email} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" required error={fieldErrors?.password} hint="Min 8 chars · 1 uppercase · 1 number" />
        <Field label="Confirm Password" name="confirmPassword" type="password" autoComplete="new-password" required error={fieldErrors?.confirmPassword} />
        
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-xs text-slate-500 uppercase">
              Or register using
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                  },
                });
              }}
              className="w-full flex items-center justify-center gap-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-medium h-10 rounded-lg"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.98 1 12 1 7.24 1 3.23 3.73 1.34 7.73l3.87 3C6.12 7.74 8.79 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.58l3.77 2.92c2.2-2.03 3.68-5.01 3.68-8.67z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.21 14.27c-.24-.72-.37-1.49-.37-2.27s.13-1.55.37-2.27L1.34 7.73C.49 9.43 0 11.31 0 13.27s.49 3.84 1.34 5.54l3.87-3z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.77-2.92c-1.12.75-2.54 1.2-4.19 1.2-3.21 0-5.88-2.7-6.79-5.69l-3.87 3C3.23 20.27 7.24 23 12 23z"
                />
              </svg>
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                await supabase.auth.signInWithOAuth({
                  provider: 'linkedin_oidc',
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                  },
                });
              }}
              className="w-full flex items-center justify-center gap-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-medium h-10 rounded-lg"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0077B5">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              LinkedIn
            </Button>
          </div>
        </div>
      </div>

      {/* Step 2 — Academic */}
      <div id="step-1" className={cn('space-y-4', step !== 1 && 'hidden')}>
        <Field label="Full Name" name="full_name" required error={fieldErrors?.full_name} />
        <div>
          <Label htmlFor="batch_year">Batch Year (graduation) <span className="text-rose-600">*</span></Label>
          <select
            id="batch_year"
            name="batch_year"
            required
            className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          >
            <option value="">Select year…</option>
            {BATCH_YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <FieldError message={fieldErrors?.batch_year} />
        </div>
        <div>
          <Label htmlFor="course">Course <span className="text-rose-600">*</span></Label>
          <select
            id="course"
            name="course"
            required
            className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          >
            <option value="">Select course…</option>
            <option value="Science">Science</option>
            <option value="Commerce">Commerce</option>
            <option value="Arts">Arts</option>
            <option value="Other">Other</option>
          </select>
          <FieldError message={fieldErrors?.course} />
        </div>
        <Field label="Roll Number (optional)" name="roll_number" />
      </div>

      {/* Step 3 — Personal */}
      <div id="step-2" className={cn('space-y-4', step !== 2 && 'hidden')}>
        <Field label="Phone (10-digit Indian mobile)" name="phone" type="tel" inputMode="tel" placeholder="9876543210" error={fieldErrors?.phone} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" name="current_city" />
          <Field label="State" name="current_state" />
        </div>
        <Field label="Country" name="current_country" defaultValue="India" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of Birth" name="date_of_birth" type="date" />
          <div>
            <Label htmlFor="gender">Gender</Label>
            <select id="gender" name="gender" className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]">
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Step 4 — Professional */}
      <div id="step-3" className={cn('space-y-4', step !== 3 && 'hidden')}>
        <Field label="Occupation" name="occupation" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company / Organisation" name="company" />
          <Field label="Job Title" name="job_title" />
        </div>
        <Field label="Industry" name="industry" />
        <Field label="LinkedIn URL" name="linkedin_url" type="url" placeholder="https://linkedin.com/in/..." error={fieldErrors?.linkedin_url} />
        <div>
          <Label htmlFor="bio">Short bio (max 500 chars)</Label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={500}
            className="mt-1.5 flex w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          />
          <FieldError message={fieldErrors?.bio} />
        </div>

        <div className="space-y-2 rounded-lg bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Privacy</p>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="hide_email" className="rounded border-slate-300" />
            Hide my email from the alumni directory
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="hide_phone" className="rounded border-slate-300" />
            Hide my phone from the alumni directory
          </label>
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="terms_accepted" className="mt-0.5 rounded border-slate-300" />
          <span>
            I confirm I am an alumnus of DAV Khagaul and I accept the{' '}
            <a href="/terms" className="text-[#0F2557] underline">Terms</a> and{' '}
            <a href="/privacy" className="text-[#0F2557] underline">Privacy Policy</a>.
          </span>
        </label>
        <FieldError message={fieldErrors?.terms_accepted} />
      </div>

      {/* Nav */}
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={back} disabled={step === 0}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            Next
          </Button>
        ) : (
          <SubmitButton />
        )}
      </div>
    </form>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  hint?: string;
  error?: string;
}

function Field({ label, name, hint, error, required, ...rest }: FieldProps) {
  const { type, ...inputProps } = rest;
  const isPassword = type === 'password';

  return (
    <div>
      <Label htmlFor={name}>
        {label} {required && <span className="text-rose-600">*</span>}
      </Label>
      {isPassword ? (
        <PasswordInput
          id={name}
          name={name}
          required={required}
          aria-describedby={`${name}-error`}
          className="mt-1.5"
          {...inputProps}
        />
      ) : (
        <Input
          id={name}
          name={name}
          type={type}
          required={required}
          aria-describedby={`${name}-error`}
          className="mt-1.5"
          {...inputProps}
        />
      )}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}
