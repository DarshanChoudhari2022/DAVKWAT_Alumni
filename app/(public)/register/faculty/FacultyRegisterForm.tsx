'use client';

import type React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/FieldError';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { INPUT_PATTERNS, VALIDATION_LIMITS } from '@/lib/validations/constraints';
import { facultyRegisterAction, type FacultyRegisterState } from './actions';

const initialState: FacultyRegisterState = {};
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1949 }, (_, i) => CURRENT_YEAR - i);

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit faculty registration'}
    </Button>
  );
}

export function FacultyRegisterForm() {
  const [state, action] = useActionState(facultyRegisterAction, initialState);

  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}

      <Field label="Email" name="email" type="email" autoComplete="email" maxLength={VALIDATION_LIMITS.emailMax} required error={state.fieldErrors?.email} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" maxLength={VALIDATION_LIMITS.passwordMax} required error={state.fieldErrors?.password} />
      <Field label="Confirm Password" name="confirmPassword" type="password" autoComplete="new-password" maxLength={VALIDATION_LIMITS.passwordMax} required error={state.fieldErrors?.confirmPassword} />
      <Field label="Full Name" name="full_name" maxLength={VALIDATION_LIMITS.nameMax} required error={state.fieldErrors?.full_name} />
      <Field label="Phone (10-digit Indian mobile)" name="phone" type="tel" inputMode="numeric" maxLength={10} pattern={INPUT_PATTERNS.indianMobile} title="Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9" error={state.fieldErrors?.phone} />

      <div>
        <Label htmlFor="taught_subject">Subject taught <span className="text-rose-600">*</span></Label>
        <Input id="taught_subject" name="taught_subject" required maxLength={VALIDATION_LIMITS.professionalTextMax} className="mt-1.5" />
        <FieldError message={state.fieldErrors?.taught_subject} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <YearField label="Taught from year" name="taught_from_year" required error={state.fieldErrors?.taught_from_year} />
        <YearField label="Taught till year" name="taught_to_year" error={state.fieldErrors?.taught_to_year} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" name="current_city" maxLength={VALIDATION_LIMITS.placeMax} />
        <Field label="State" name="current_state" maxLength={VALIDATION_LIMITS.placeMax} />
        <Field label="Country" name="current_country" defaultValue="India" maxLength={VALIDATION_LIMITS.placeMax} />
      </div>

      <div>
        <Label htmlFor="bio">Verification note / short bio</Label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={VALIDATION_LIMITS.bioMax}
          className="mt-1.5 flex w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
        />
        <FieldError message={state.fieldErrors?.bio} />
      </div>

      <div className="space-y-2 rounded-lg bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">Privacy</p>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="hide_email" className="rounded border-slate-300" />
          Hide my email from the directory
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="hide_phone" className="rounded border-slate-300" />
          Hide my phone from the directory
        </label>
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" name="terms_accepted" className="mt-0.5 rounded border-slate-300" />
        <span>
          I confirm these faculty details are accurate and I accept the{' '}
          <a href="/terms" className="text-[#0F2557] underline">Terms</a> and{' '}
          <a href="/privacy" className="text-[#0F2557] underline">Privacy Policy</a>.
        </span>
      </label>
      <FieldError message={state.fieldErrors?.terms_accepted} />

      <SubmitButton />
    </form>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
}

function Field({ label, name, error, required, type, ...rest }: FieldProps) {
  const isPassword = type === 'password';
  return (
    <div>
      <Label htmlFor={name}>{label} {required && <span className="text-rose-600">*</span>}</Label>
      {isPassword ? (
        <PasswordInput id={name} name={name} required={required} className="mt-1.5" {...rest} />
      ) : (
        <Input id={name} name={name} type={type} required={required} className="mt-1.5" {...rest} />
      )}
      <FieldError message={error} />
    </div>
  );
}

function YearField({
  label,
  name,
  required,
  error,
}: {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label} {required && <span className="text-rose-600">*</span>}</Label>
      <select
        id={name}
        name={name}
        required={required}
        className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
      >
        <option value="">Select year...</option>
        {YEARS.map((year) => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}
