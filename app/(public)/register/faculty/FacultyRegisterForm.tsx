'use client';

import type React from 'react';
import { useState, useActionState, useRef, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/FieldError';
import { PasswordInput } from '@/components/shared/PasswordInput';
import { INPUT_PATTERNS, VALIDATION_LIMITS } from '@/lib/validations/constraints';
import { facultyRegisterAction, type FacultyRegisterState } from './actions';
import { DocumentUpload } from '@/components/shared/DocumentUpload';

const initialState: FacultyRegisterState = {};
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1949 }, (_, i) => CURRENT_YEAR - i);

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="accent" loading={pending}>
      Submit faculty registration
    </Button>
  );
}

export function FacultyRegisterForm() {
  const [state, action] = useActionState(facultyRegisterAction, initialState);
  const [hasSchoolDoc, setHasSchoolDoc] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveFormDraft = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (!formRef.current) return;
      const fd = new FormData(formRef.current);
      const draft: Record<string, unknown> = {};

      for (const [key, value] of fd.entries()) {
        if (key === 'password' || key === 'confirmPassword') {
          continue;
        }
        draft[key] = value;
      }

      const checkboxes = ['hide_email', 'hide_phone', 'terms_accepted'];
      checkboxes.forEach((cb) => {
        const el = formRef.current?.querySelector<HTMLInputElement>(`input[name="${cb}"]`);
        if (el) {
          draft[cb] = el.checked;
        }
      });

      localStorage.setItem('davkawt_faculty_register_draft', JSON.stringify(draft));
    }, 500);
  };

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem('davkawt_faculty_register_draft');
    if (!saved) return;

    try {
      const draft = JSON.parse(saved);
      if (!draft) return;

      setTimeout(() => {
        if (!formRef.current) return;
        Object.entries(draft).forEach(([key, value]) => {
          if (['password', 'confirmPassword'].includes(key)) {
            return;
          }

          const input = formRef.current?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            `[name="${key}"]`
          );

          if (input) {
            if (input.type === 'checkbox') {
              (input as HTMLInputElement).checked = !!value;
            } else {
              input.value = String(value);
            }
          }
        });
      }, 100);
    } catch (e) {
      console.error('[faculty-register] failed to restore draft:', e);
    }
  }, []);

  // Clean up save draft timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return (
    <form ref={formRef} action={action} onChange={saveFormDraft} onInput={saveFormDraft} className="space-y-5">
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

      {/* Proof of Identity Upload (Compulsory) */}
      <div className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
        <DocumentUpload
          name="school_document"
          label="Proof of Identity (School ID card, Appointment Letter, Salary Slip, any School Document showing your name and role, etc.)"
          required
          error={state.fieldErrors?.school_document}
          maxRawSize={10 * 1024 * 1024}
          targetCompressedSize={350 * 1024}
          onChange={(f) => setHasSchoolDoc(!!f)}
        />
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
