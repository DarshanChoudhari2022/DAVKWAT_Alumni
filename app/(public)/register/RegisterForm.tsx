'use client';

import Image from 'next/image';
import type React from 'react';
import { useActionState, useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/FieldError';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { cn } from '@/lib/utils/cn';
import {
  buildManualPaymentWhatsappUrl,
  buildUpiPaymentUrl,
  MANUAL_MEMBERSHIP_PAYMENT,
} from '@/lib/payments/manual-upi';
import { INPUT_PATTERNS, VALIDATION_LIMITS, todayIsoDate } from '@/lib/validations/constraints';
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
  const [educationLevel, setEducationLevel] = useState('');
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const upiPaymentUrl = buildUpiPaymentUrl();
  const maxBirthDate = todayIsoDate();

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

  function openPaymentWhatsapp() {
    const formData = formRef.current ? new FormData(formRef.current) : null;
    const getValue = (name: string) => String(formData?.get(name) ?? '').trim();

    window.open(
      buildManualPaymentWhatsappUrl({
        fullName: getValue('full_name'),
        batchYear: getValue('passing_year'),
        phone: getValue('phone'),
      }),
      '_blank',
      'noopener,noreferrer'
    );
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
        <Field label="Email" name="email" type="email" autoComplete="email" maxLength={VALIDATION_LIMITS.emailMax} required error={fieldErrors?.email} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" maxLength={VALIDATION_LIMITS.passwordMax} required error={fieldErrors?.password} hint="Min 8 chars, 1 uppercase, 1 number" />
        <Field label="Confirm Password" name="confirmPassword" type="password" autoComplete="new-password" maxLength={VALIDATION_LIMITS.passwordMax} required error={fieldErrors?.confirmPassword} />
      </div>

      {/* Step 2 — Academic */}
      <div id="step-1" className={cn('space-y-4', step !== 1 && 'hidden')}>
        <Field label="Full Name" name="full_name" maxLength={VALIDATION_LIMITS.nameMax} required error={fieldErrors?.full_name} />
        <div>
          <Label htmlFor="education_level">Highest level completed at DAV Khagaul <span className="text-rose-600">*</span></Label>
          <select
            id="education_level"
            name="education_level"
            required
            value={educationLevel}
            onChange={(event) => setEducationLevel(event.target.value)}
            className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          >
            <option value="">Select level...</option>
            <option value="left_before_10th">Left before completing 10th</option>
            <option value="secondary">10th / Secondary</option>
            <option value="senior_secondary">12th / Senior Secondary</option>
            <option value="other">Other</option>
          </select>
          <FieldError message={fieldErrors?.education_level} />
        </div>
        {educationLevel === 'senior_secondary' && (
          <div>
            <Label htmlFor="education_stream">Stream <span className="text-rose-600">*</span></Label>
            <select
              id="education_stream"
              name="education_stream"
              required
              className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            >
              <option value="">Select stream...</option>
              <option value="Science">Science</option>
              <option value="Commerce">Commerce</option>
              <option value="Arts">Arts</option>
            </select>
            <FieldError message={fieldErrors?.education_stream} />
          </div>
        )}
        <div>
          <Label htmlFor="passing_year">Year of passing <span className="text-rose-600">*</span></Label>
          <select
            id="passing_year"
            name="passing_year"
            required
            className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          >
            <option value="">Select year...</option>
            {BATCH_YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <FieldError message={fieldErrors?.passing_year} />
        </div>
        <Field label="Roll Number (optional)" name="roll_number" maxLength={VALIDATION_LIMITS.rollNumberMax} />
      </div>

      {/* Step 3 — Personal */}
      <div id="step-2" className={cn('space-y-4', step !== 2 && 'hidden')}>
        <Field label="Phone (10-digit Indian mobile)" name="phone" type="tel" inputMode="numeric" maxLength={10} pattern={INPUT_PATTERNS.indianMobile} title="Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9" placeholder="9876543210" error={fieldErrors?.phone} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" name="current_city" maxLength={VALIDATION_LIMITS.placeMax} />
          <Field label="State" name="current_state" maxLength={VALIDATION_LIMITS.placeMax} />
        </div>
        <Field label="Country" name="current_country" defaultValue="India" maxLength={VALIDATION_LIMITS.placeMax} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of Birth" name="date_of_birth" type="date" min={VALIDATION_LIMITS.minBirthDate} max={maxBirthDate} />
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
        <Field label="Occupation" name="occupation" maxLength={VALIDATION_LIMITS.professionalTextMax} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company / Organisation" name="company" maxLength={VALIDATION_LIMITS.professionalTextMax} />
          <Field label="Job Title" name="job_title" maxLength={VALIDATION_LIMITS.professionalTextMax} />
        </div>
        <Field label="Industry" name="industry" maxLength={VALIDATION_LIMITS.industryMax} />
        <Field label="LinkedIn URL" name="linkedin_url" type="url" maxLength={VALIDATION_LIMITS.urlMax} placeholder="https://linkedin.com/in/..." error={fieldErrors?.linkedin_url} />
        <div>
          <Label htmlFor="bio">Short bio (max 500 chars)</Label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={VALIDATION_LIMITS.bioMax}
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

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="mx-auto w-full max-w-[220px] shrink-0 overflow-hidden rounded-xl border border-white bg-white p-2 shadow-sm sm:mx-0">
              <Image
                src={MANUAL_MEMBERSHIP_PAYMENT.qrImagePath}
                alt={`UPI QR code for ${MANUAL_MEMBERSHIP_PAYMENT.payeeName}`}
                width={1002}
                height={1600}
                className="h-auto w-full rounded-lg"
              />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Pay membership fee by UPI
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Scan this QR with any UPI app, or tap the button below on mobile.
                  After payment, send the screenshot or transaction ID on WhatsApp
                  for manual verification.
                </p>
              </div>
              <div className="rounded-lg bg-white/80 p-3 text-sm text-slate-700">
                <p>
                  <span className="font-medium">UPI ID:</span>{' '}
                  {MANUAL_MEMBERSHIP_PAYMENT.upiId}
                </p>
                <p>
                  <span className="font-medium">Payee:</span>{' '}
                  {MANUAL_MEMBERSHIP_PAYMENT.payeeName}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button asChild variant="accent">
                  <a href={upiPaymentUrl}>Open UPI app</a>
                </Button>
                <Button type="button" variant="outline" onClick={openPaymentWhatsapp}>
                  I have paid - WhatsApp proof
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                Payment is checked manually by the Trust team. Registration approval
                is completed after alumni and payment verification.
              </p>
            </div>
          </div>
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
