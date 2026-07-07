'use client';

import type React from 'react';
import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/FieldError';
import { cn } from '@/lib/utils/cn';
import { VALIDATION_LIMITS } from '@/lib/validations/constraints';
import { LEFT_BEFORE_CLASSES } from '@/lib/validations/registration';
import { PhotoUploadWithCrop } from '@/components/shared/PhotoUploadWithCrop';
import { completeRegistrationAction, type CompleteState } from './actions';

const initialState: CompleteState = {};
const CURRENT_YEAR = new Date().getFullYear();
const BATCH_YEARS = Array.from({ length: CURRENT_YEAR - 1959 }, (_, i) => CURRENT_YEAR - i);
const STEPS = ['Academic & Verification', 'Personal Details', 'Professional Profile'] as const;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const BIRTH_YEARS = Array.from({ length: CURRENT_YEAR - 1919 }, (_, i) => CURRENT_YEAR - i);

/** Country codes for the phone dropdown — US/UK at top, then common codes */
const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 India (+91)' },
  { code: '+1', label: '🇺🇸 US (+1)' },
  { code: '+44', label: '🇬🇧 UK (+44)' },
  { code: '+61', label: '🇦🇺 Australia (+61)' },
  { code: '+971', label: '🇦🇪 UAE (+971)' },
  { code: '+65', label: '🇸🇬 Singapore (+65)' },
  { code: '+49', label: '🇩🇪 Germany (+49)' },
  { code: '+81', label: '🇯🇵 Japan (+81)' },
  { code: '+86', label: '🇨🇳 China (+86)' },
  { code: '+33', label: '🇫🇷 France (+33)' },
  { code: '+966', label: '🇸🇦 Saudi Arabia (+966)' },
  { code: '+974', label: '🇶🇦 Qatar (+974)' },
  { code: '+968', label: '🇴🇲 Oman (+968)' },
  { code: '+977', label: '🇳🇵 Nepal (+977)' },
  { code: '+880', label: '🇧🇩 Bangladesh (+880)' },
  { code: '+94', label: '🇱🇰 Sri Lanka (+94)' },
  { code: '+60', label: '🇲🇾 Malaysia (+60)' },
  { code: '+27', label: '🇿🇦 South Africa (+27)' },
  { code: '+82', label: '🇰🇷 South Korea (+82)' },
  { code: '+39', label: '🇮🇹 Italy (+39)' },
  { code: '+7', label: '🇷🇺 Russia (+7)' },
  { code: '+55', label: '🇧🇷 Brazil (+55)' },
  { code: '+52', label: '🇲🇽 Mexico (+52)' },
  { code: '+234', label: '🇳🇬 Nigeria (+234)' },
  { code: '+254', label: '🇰🇪 Kenya (+254)' },
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" loading={pending}>
      Submit registration
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

  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [countryCode, setCountryCode] = useState('+91');



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

    // Custom validation for profile photo on Step 1 (Personal Details)
    if (step === 1) {
      const photoInput = stepDiv.querySelector<HTMLInputElement>('input[name="profile_photo"]');
      if (photoInput && (!photoInput.files || photoInput.files.length === 0)) {
        errors['profile_photo'] = 'Profile photo is required';
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
    // Combine country code + phone number into a single "phone" field
    const phoneNumber = fd.get('phone_number') as string;
    const phoneCountry = fd.get('phone_country_code') as string;
    if (phoneNumber) {
      fd.set('phone', `${phoneCountry}${phoneNumber}`);
    }
    fd.delete('phone_number');
    fd.delete('phone_country_code');
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
            <option value="left_before_10th">Left before completing Secondary (10th)</option>
            <option value="secondary">Secondary (10th)</option>
            <option value="senior_secondary">Higher Secondary (12th)</option>
          </select>
          <FieldError message={fieldErrors?.education_level} />
        </div>
        {educationLevel === 'left_before_10th' && (
          <div>
            <Label htmlFor="left_before_schooling_class">
              Till what class did you study at DAV Khagaul? <span className="text-rose-600">*</span>
            </Label>
            <select
              id="left_before_schooling_class"
              name="left_before_schooling_class"
              required
              className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            >
              <option value="">Select class...</option>
              {LEFT_BEFORE_CLASSES.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            <FieldError message={fieldErrors?.left_before_schooling_class} />
          </div>
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
            <Label htmlFor="passing_year">
              Year of passing your Secondary 10th batch <span className="text-rose-600">*</span>
            </Label>
            <p className="text-xs text-slate-500 mt-0.5">If you have completed 10th, in which year?</p>
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
              <Label htmlFor="passing_year_10th">
                Year of passing your Secondary 10th batch <span className="text-rose-600">*</span>
              </Label>
              <p className="text-xs text-slate-500 mt-0.5">If you have completed 10th, in which year?</p>
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
        {educationLevel === 'left_before_10th' && (
          <div>
            <Label htmlFor="passing_year">Year of leaving DAV Khagaul <span className="text-rose-600">*</span></Label>
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
            <p className="mt-1 text-xs text-slate-500">
              Your passout batch will be automatically calculated based on the class you studied till.
            </p>
            <FieldError message={fieldErrors?.passing_year} />
          </div>
        )}
        {!educationLevel && (
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
        {/* Profile Photo — Compulsory */}
        <div>
          <Label htmlFor="profile_photo">
            Profile Photo <span className="text-rose-600">*</span>
          </Label>
          <div className="mt-1.5">
            <PhotoUploadWithCrop name="profile_photo" required error={fieldErrors?.profile_photo} />
          </div>
        </div>

        {/* Phone — International */}
        <div>
          <Label htmlFor="phone_number">Phone</Label>
          <div className="mt-1.5 flex gap-2">
            <select
              id="phone_country_code"
              name="phone_country_code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="flex h-10 w-[160px] shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            >
              {COUNTRY_CODES.map((cc) => (
                <option key={cc.code} value={cc.code}>{cc.label}</option>
              ))}
            </select>
            <Input
              id="phone_number"
              name="phone_number"
              type="tel"
              inputMode="numeric"
              maxLength={15}
              placeholder="9876543210"
              className="flex-1"
            />
          </div>
          <FieldError message={fieldErrors?.phone} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current City" name="current_city" maxLength={VALIDATION_LIMITS.placeMax} />
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
