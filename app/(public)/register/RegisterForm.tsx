'use client';

import Image from 'next/image';
import type React from 'react';
import { useActionState, useState, useRef, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Copy, Download, Check } from 'lucide-react';
import { toast } from 'sonner';
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
import { INPUT_PATTERNS, VALIDATION_LIMITS } from '@/lib/validations/constraints';
import { registerAction, type RegisterState } from './actions';

const initialState: RegisterState = {};
const CURRENT_YEAR = new Date().getFullYear();
const BATCH_YEARS = Array.from({ length: CURRENT_YEAR - 1959 }, (_, i) => CURRENT_YEAR - i);
const STEPS = ['Account', 'Academic', 'Personal', 'Professional'] as const;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const BIRTH_YEARS = Array.from({ length: CURRENT_YEAR - 1919 }, (_, i) => CURRENT_YEAR - i);

const FIELD_STEP_MAP: Record<string, number> = {
  email: 0,
  password: 0,
  confirmPassword: 0,
  full_name: 1,
  education_level: 1,
  education_stream: 1,
  left_before_schooling_class: 1,
  passing_year: 1,
  passing_year_10th: 1,
  roll_number: 1,
  phone: 2,
  current_city: 2,
  current_state: 2,
  current_country: 2,
  date_of_birth: 2,
  gender: 2,
  occupation: 3,
  company: 3,
  job_title: 3,
  industry: 3,
  linkedin_url: 3,
  bio: 3,
  hide_email: 3,
  hide_phone: 3,
  terms_accepted: 3,
};

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

  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');

  const [copiedUpi, setCopiedUpi] = useState(false);
  const handleCopyUpi = () => {
    navigator.clipboard.writeText(MANUAL_MEMBERSHIP_PAYMENT.upiId);
    setCopiedUpi(true);
    toast.success('UPI ID copied to clipboard');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const lastHandledStateRef = useRef<RegisterState>(initialState);
  const shouldScrollToFieldRef = useRef<string | null>(null);

  // Effect to switch step and scroll/toast on state change
  useEffect(() => {
    if (state === lastHandledStateRef.current) return;
    lastHandledStateRef.current = state;

    if (state.error) {
      toast.error(state.error);
      setTimeout(() => {
        const errorEl = document.getElementById('register-error-alert');
        if (errorEl) {
          errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    } else if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
      const firstErrorKey = Object.keys(state.fieldErrors)[0];
      if (firstErrorKey) {
        const targetStep = FIELD_STEP_MAP[firstErrorKey];
        if (typeof targetStep === 'number' && targetStep !== step) {
          shouldScrollToFieldRef.current = firstErrorKey;
          setStep(targetStep);
        } else {
          setTimeout(() => {
            const errorEl = document.getElementsByName(firstErrorKey)[0] || document.getElementById(firstErrorKey);
            if (errorEl) {
              errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              errorEl.focus();
            }
          }, 50);
        }
      }
    }
  }, [state, step]);

  // Effect to scroll to the field error after the step changes
  useEffect(() => {
    const fieldKey = shouldScrollToFieldRef.current;
    if (fieldKey) {
      const targetStep = FIELD_STEP_MAP[fieldKey];
      if (targetStep === step) {
        shouldScrollToFieldRef.current = null;
        setTimeout(() => {
          const errorEl = document.getElementsByName(fieldKey)[0] || document.getElementById(fieldKey);
          if (errorEl) {
            errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorEl.focus();
          }
        }, 50);
      }
    }
  }, [step]);

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
        <div id="register-error-alert" role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
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
            <option value="left_before_10th">Left before completing schooling</option>
            <option value="secondary">Secondary (10th)</option>
            <option value="senior_secondary">Higher Secondary (12th)</option>
            <option value="other">Other</option>
          </select>
          <FieldError message={fieldErrors?.education_level} />
        </div>
        {educationLevel === 'left_before_10th' && (
          <Field
            label="Till what class did you study? (e.g. Class 8)"
            name="left_before_schooling_class"
            required
            maxLength={50}
            placeholder="e.g. Class 8"
            error={fieldErrors?.left_before_schooling_class}
          />
        )}
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
        {educationLevel === 'secondary' && (
          <div>
            <Label htmlFor="passing_year">Year of passing (Secondary (10th)) <span className="text-rose-600">*</span></Label>
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
        )}
        {educationLevel === 'senior_secondary' && (
          <>
            <div>
              <Label htmlFor="passing_year">Year of passing (Higher Secondary (12th)) <span className="text-rose-600">*</span></Label>
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
            <div>
              <Label htmlFor="passing_year_10th">Year of passing (Secondary (10th)) <span className="text-rose-600">*</span></Label>
              <select
                id="passing_year_10th"
                name="passing_year_10th"
                required
                className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
              >
                <option value="">Select year...</option>
                {BATCH_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <FieldError message={fieldErrors?.passing_year_10th} />
            </div>
          </>
        )}
        {(educationLevel === 'left_before_10th' || educationLevel === 'other' || !educationLevel) && (
          <div>
            <Label htmlFor="passing_year">Year of leaving/passing <span className="text-rose-600">*</span></Label>
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
        )}
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
          <div>
            <Label htmlFor="dob_month">Date of Birth</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              <select
                id="dob_month"
                value={dobMonth}
                onChange={(e) => setDobMonth(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
              >
                <option value="">Month</option>
                {MONTHS.map((m, idx) => (
                  <option key={m} value={String(idx + 1).padStart(2, '0')}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                id="dob_day"
                value={dobDay}
                onChange={(e) => setDobDay(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
              >
                <option value="">Day</option>
                {DAYS.map((d) => (
                  <option key={d} value={String(d).padStart(2, '0')}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                id="dob_year"
                value={dobYear}
                onChange={(e) => setDobYear(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
              >
                <option value="">Year</option>
                {BIRTH_YEARS.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="hidden"
              id="date_of_birth"
              name="date_of_birth"
              value={
                dobYear && dobMonth && dobDay
                  ? `${dobYear}-${dobMonth}-${dobDay}`
                  : ''
              }
            />
            <FieldError message={fieldErrors?.date_of_birth} />
          </div>
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
            <div className="mx-auto w-full max-w-[220px] shrink-0 sm:mx-0 flex flex-col items-center">
              <div className="overflow-hidden rounded-xl border border-white bg-white p-2 shadow-sm w-full">
                <Image
                  src={MANUAL_MEMBERSHIP_PAYMENT.qrImagePath}
                  alt={`UPI QR code for ${MANUAL_MEMBERSHIP_PAYMENT.payeeName}`}
                  width={1002}
                  height={1600}
                  className="h-auto w-full rounded-lg"
                />
              </div>
              <a
                href={MANUAL_MEMBERSHIP_PAYMENT.qrImagePath}
                download="davkawt-upi-qr.jpeg"
                className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="h-3.5 w-3.5" />
                Download QR Code
              </a>
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
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate">
                    <span className="font-medium text-slate-900">UPI ID:</span>{' '}
                    <span className="font-mono bg-slate-100/50 px-1 py-0.5 rounded text-xs select-all text-slate-800">{MANUAL_MEMBERSHIP_PAYMENT.upiId}</span>
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="inline-flex items-center gap-1 shrink-0 rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:scale-105 active:scale-95 shadow-sm"
                  >
                    {copiedUpi ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-1.5">
                  <span className="font-medium text-slate-900">Payee:</span>{' '}
                  <span className="text-slate-800">{MANUAL_MEMBERSHIP_PAYMENT.payeeName}</span>
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  asChild
                  variant="accent"
                  className="animate-pulse hover:animate-none hover:scale-105 active:scale-95 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-amber-500/20"
                >
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
