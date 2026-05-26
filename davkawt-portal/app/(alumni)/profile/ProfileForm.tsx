'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/shared/FieldError';
import { updateProfileAction, type ProfileState } from './actions';
import type { Database } from '@/lib/supabase/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

const initial: ProfileState = {};
const CURRENT_YEAR = new Date().getFullYear();
const BATCH_YEARS = Array.from({ length: CURRENT_YEAR - 1959 }, (_, i) => CURRENT_YEAR - i);

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Save changes'}
    </Button>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateProfileAction, initial);

  return (
    <form action={action} className="mt-6 space-y-6">
      {state.error && (
        <Banner tone="error">{state.error}</Banner>
      )}
      {state.success && (
        <Banner tone="success">Profile saved.</Banner>
      )}

      <Section title="Academic">
        <Field label="Full name" name="full_name" defaultValue={profile.full_name} required error={state.fieldErrors?.full_name} />
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
        <Field label="Roll number" name="roll_number" defaultValue={profile.roll_number ?? ''} />
      </Section>

      <Section title="Personal">
        <Field
          label="Phone (10-digit Indian mobile)"
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={profile.phone ?? ''}
          error={state.fieldErrors?.phone}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" name="current_city" defaultValue={profile.current_city ?? ''} />
          <Field label="State" name="current_state" defaultValue={profile.current_state ?? ''} />
          <Field label="Country" name="current_country" defaultValue={profile.current_country ?? 'India'} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of birth" name="date_of_birth" type="date" defaultValue={profile.date_of_birth ?? ''} />
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
        <Field label="Occupation" name="occupation" defaultValue={profile.occupation ?? ''} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company / Organisation" name="company" defaultValue={profile.company ?? ''} />
          <Field label="Job title" name="job_title" defaultValue={profile.job_title ?? ''} />
        </div>
        <Field label="Industry" name="industry" defaultValue={profile.industry ?? ''} />
        <Field
          label="LinkedIn URL"
          name="linkedin_url"
          type="url"
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
            maxLength={500}
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
