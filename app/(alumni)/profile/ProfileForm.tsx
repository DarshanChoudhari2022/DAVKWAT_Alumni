'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/FieldError';
import { updateProfileAction, type ProfileState } from './actions';
import type { Database } from '@/lib/supabase/database.types';
import { INPUT_PATTERNS, VALIDATION_LIMITS, todayIsoDate } from '@/lib/validations/constraints';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type EditableProfile = Pick<
  ProfileRow,
  | 'full_name'
  | 'batch_year'
  | 'course'
  | 'roll_number'
  | 'phone'
  | 'current_city'
  | 'current_state'
  | 'current_country'
  | 'date_of_birth'
  | 'gender'
  | 'occupation'
  | 'company'
  | 'job_title'
  | 'industry'
  | 'linkedin_url'
  | 'bio'
  | 'hide_email'
  | 'hide_phone'
>;

const initial: ProfileState = {};
const CURRENT_YEAR = new Date().getFullYear();
const BATCH_YEARS = Array.from({ length: CURRENT_YEAR - 1959 }, (_, i) => CURRENT_YEAR - i);

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Save changes
    </Button>
  );
}

export function ProfileForm({ profile }: { profile: EditableProfile }) {
  const [state, action] = useActionState(updateProfileAction, initial);
  const maxBirthDate = todayIsoDate();

  return (
    <form action={action} className="mt-6 space-y-6">
      {state.error && (
        <Banner tone="error">{state.error}</Banner>
      )}
      {state.success && (
        <Banner tone="success">Profile saved.</Banner>
      )}

      <Section title="Academic">
        <Field label="Full name" name="full_name" defaultValue={profile.full_name} maxLength={VALIDATION_LIMITS.nameMax} required error={state.fieldErrors?.full_name} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="batch_year">Batch year *</Label>
            <select
              id="batch_year"
              name="batch_year"
              required
              defaultValue={profile.batch_year}
              className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            >
              {BATCH_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <FieldError message={state.fieldErrors?.batch_year} />
          </div>
          <div>
            <Label htmlFor="course">Course *</Label>
            <select
              id="course"
              name="course"
              required
              defaultValue={profile.course}
              className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            >
              <option value="Science">Science</option>
              <option value="Commerce">Commerce</option>
              <option value="Arts">Arts</option>
              <option value="Other">Other</option>
            </select>
            <FieldError message={state.fieldErrors?.course} />
          </div>
        </div>
        <Field label="Roll number" name="roll_number" defaultValue={profile.roll_number ?? ''} maxLength={VALIDATION_LIMITS.rollNumberMax} />
      </Section>

      <Section title="Personal">
        <Field
          label="Phone (International or Indian mobile)"
          name="phone"
          type="tel"
          inputMode="numeric"
          maxLength={20}
          pattern={INPUT_PATTERNS.internationalPhone}
          title="Enter a valid phone number (7-15 digits, optionally starting with +)"
          defaultValue={profile.phone ?? ''}
          error={state.fieldErrors?.phone}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Current City" name="current_city" defaultValue={profile.current_city ?? ''} maxLength={VALIDATION_LIMITS.placeMax} />
          <Field label="State" name="current_state" defaultValue={profile.current_state ?? ''} maxLength={VALIDATION_LIMITS.placeMax} />
          <Field label="Country" name="current_country" defaultValue={profile.current_country ?? 'India'} maxLength={VALIDATION_LIMITS.placeMax} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of birth" name="date_of_birth" type="date" min={VALIDATION_LIMITS.minBirthDate} max={maxBirthDate} defaultValue={profile.date_of_birth ?? ''} />
          <div>
            <Label htmlFor="gender">Gender</Label>
            <select id="gender" name="gender" defaultValue={profile.gender ?? ''} className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]">
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Professional">
        <Field label="Occupation" name="occupation" defaultValue={profile.occupation ?? ''} maxLength={VALIDATION_LIMITS.professionalTextMax} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company / Organisation" name="company" defaultValue={profile.company ?? ''} maxLength={VALIDATION_LIMITS.professionalTextMax} />
          <Field label="Job title" name="job_title" defaultValue={profile.job_title ?? ''} maxLength={VALIDATION_LIMITS.professionalTextMax} />
        </div>
        <Field label="Industry" name="industry" defaultValue={profile.industry ?? ''} maxLength={VALIDATION_LIMITS.industryMax} />
        <Field
          label="LinkedIn URL"
          name="linkedin_url"
          type="url"
          maxLength={VALIDATION_LIMITS.urlMax}
          placeholder="https://linkedin.com/in/..."
          defaultValue={profile.linkedin_url ?? ''}
          error={state.fieldErrors?.linkedin_url}
        />
        <div>
          <Label htmlFor="bio">Short bio (max 500 chars)</Label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={VALIDATION_LIMITS.bioMax}
            defaultValue={profile.bio ?? ''}
            className="mt-1.5 flex w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          />
          <FieldError message={state.fieldErrors?.bio} />
        </div>
      </Section>

      <Section title="Privacy">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="hide_email" defaultChecked={profile.hide_email} className="rounded border-slate-300" />
          Hide my email from the alumni directory
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="hide_phone" defaultChecked={profile.hide_phone} className="rounded border-slate-300" />
          Hide my phone from the alumni directory
        </label>
      </Section>

      <div className="flex justify-end">
        <SaveButton />
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
      <Input id={name} name={name} required={required} className="mt-1.5" {...rest} />
      <FieldError message={error} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-slate-100 p-5">
      <legend className="-ml-1 px-1 text-sm font-semibold uppercase tracking-wide text-slate-600">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Banner({ tone, children }: { tone: 'success' | 'error'; children: React.ReactNode }) {
  const cls =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : 'border-rose-200 bg-rose-50 text-rose-700';
  return (
    <div role="alert" className={`rounded-lg border p-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}
