'use client';

import type React from 'react';
import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/FieldError';
import { cn } from '@/lib/utils/cn';
import { INPUT_PATTERNS, VALIDATION_LIMITS, todayIsoDate } from '@/lib/validations/constraints';
import { completeRegistrationAction, type CompleteState } from './actions';

const initialState: CompleteState = {};
const CURRENT_YEAR = new Date().getFullYear();
const BATCH_YEARS = Array.from({ length: CURRENT_YEAR - 1959 }, (_, i) => CURRENT_YEAR - i);
const STEPS = ['Academic & Verification', 'Personal Details', 'Professional Profile'] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit registration'}
    </Button>
  );
}

interface RegisterCompleteFormProps {
  initialData: {
    email: string;
    full_name: string;
  };
}

export function RegisterCompleteForm({ initialData }: RegisterCompleteFormProps) {
  const [state, formAction] = useActionState(completeRegistrationAction, initialState);
  const [step, setStep] = useState(0);
  const [educationLevel, setEducationLevel] = useState('');
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const maxBirthDate = todayIsoDate();

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
    if (!validateCurrentStep()) return;
    formAction(fd);
  }

  const fieldErrors = { ...clientErrors, ...state.fieldErrors };

  return (
    <form ref={formRef} action={handleSubmit} noValidate className="space-y-6">
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

      <div id="step-0" className={cn('space-y-4', step !== 0 && 'hidden')}>
        <div>
          <Label htmlFor="email">Registered Email</Label>
          <Input
            id="email"
            type="email"
            value={initialData.email}
            disabled
            className="mt-1.5 cursor-not-allowed bg-slate-50 text-slate-500"
          />
        </div>
        <Field
          label="Full Name"
          name="full_name"
          defaultValue={initialData.full_name}
          maxLength={VALIDATION_LIMITS.nameMax}
          required
          error={fieldErrors?.full_name}
        />
        <div>
          <Label htmlFor="education_level">
            Highest level completed at DAV Khagaul <span className="text-rose-600">*</span>
          </Label>
          <select
            id="education_level"
            name="education_level"
            required
            value={educationLevel}
            onChange={(event) => setEducationLevel(event.target.value)}
            className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          >
            <option value="">Select level...</option>
            <option value="left_before_10th">Left before completing Secondary</option>
            <option value="secondary">Secondary</option>
            <option value="senior_secondary">Higher Secondary</option>
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
        {educationLevel === 'secondary' && (
          <div>
            <Label htmlFor="passing_year">Year of passing (Secondary) <span className="text-rose-600">*</span></Label>
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
              <Label htmlFor="passing_year">Year of passing (Higher Secondary) <span className="text-rose-600">*</span></Label>
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
              <Label htmlFor="passing_year_10th">Year of passing (Secondary) <span className="text-rose-600">*</span></Label>
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

      <div id="step-1" className={cn('space-y-4', step !== 1 && 'hidden')}>
        <Field
          label="Phone (10-digit Indian mobile)"
          name="phone"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          pattern={INPUT_PATTERNS.indianMobile}
          title="Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9"
          placeholder="9876543210"
          error={fieldErrors?.phone}
        />
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

      <div id="step-2" className={cn('space-y-4', step !== 2 && 'hidden')}>
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

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" name="terms_accepted" className="mt-0.5 rounded border-slate-300" />
          <span>
            I confirm I am an alumnus of DAV Khagaul and I accept the{' '}
            <a href="/terms" target="_blank" className="text-[#0F2557] underline">Terms</a> and{' '}
            <a href="/privacy" target="_blank" className="text-[#0F2557] underline">Privacy Policy</a>.
          </span>
        </label>
        <FieldError message={fieldErrors?.terms_accepted} />
      </div>

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
  error?: string;
}

function Field({ label, name, error, required, ...rest }: FieldProps) {
  return (
    <div>
      <Label htmlFor={name}>
        {label} {required && <span className="text-rose-600">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        required={required}
        aria-describedby={`${name}-error`}
        className="mt-1.5"
        {...rest}
      />
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}
