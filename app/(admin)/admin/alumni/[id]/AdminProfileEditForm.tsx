'use client';

import { useState, useTransition, type InputHTMLAttributes } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { readApiResponse } from '@/lib/utils/api-client';
import { INPUT_PATTERNS, VALIDATION_LIMITS } from '@/lib/validations/constraints';

interface AdminProfileEditFormProps {
  alumniId: string;
  initial: {
    full_name: string;
    email: string;
    display_name: string | null;
    phone: string | null;
    alternate_phone: string | null;
    current_city: string | null;
    current_state: string | null;
    current_country: string | null;
    occupation: string | null;
    company: string | null;
    job_title: string | null;
    industry: string | null;
    linkedin_url: string | null;
    website_url: string | null;
    bio: string | null;
    achievements: string | null;
    hide_email: boolean;
    hide_phone: boolean;
  };
}

export function AdminProfileEditForm({ alumniId, initial }: AdminProfileEditFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    const payload = {
      full_name: formData.get('full_name'),
      email: formData.get('email'),
      display_name: formData.get('display_name'),
      phone: formData.get('phone'),
      alternate_phone: formData.get('alternate_phone'),
      current_city: formData.get('current_city'),
      current_state: formData.get('current_state'),
      current_country: formData.get('current_country'),
      occupation: formData.get('occupation'),
      company: formData.get('company'),
      job_title: formData.get('job_title'),
      industry: formData.get('industry'),
      linkedin_url: formData.get('linkedin_url'),
      website_url: formData.get('website_url'),
      bio: formData.get('bio'),
      achievements: formData.get('achievements'),
      hide_email: formData.get('hide_email') === 'on',
      hide_phone: formData.get('hide_phone') === 'on',
    };

    startTransition(async () => {
      const res = await fetch(`/api/admin/alumni/${alumniId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await readApiResponse<{ error?: string }>(res);
      if (!res.ok) {
        setError(data.error ?? 'Could not update this alumni profile.');
        return;
      }

      setSuccess('Profile updated.');
      router.refresh();
    });
  }

  const inputClass =
    'mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]';
  const labelClass = 'block text-sm font-medium text-slate-700';

  function Field({
    label,
    name,
    defaultValue,
    type = 'text',
    required = false,
    ...inputProps
  }: {
    label: string;
    name: string;
    defaultValue: string;
    type?: string;
    required?: boolean;
  } & Omit<InputHTMLAttributes<HTMLInputElement>, 'defaultValue' | 'name' | 'type' | 'required'>) {
    return (
      <div>
        <label htmlFor={name} className={labelClass}>
          {label}
        </label>
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          required={required}
          className={inputClass}
          {...inputProps}
        />
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{success}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full Name" name="full_name" defaultValue={initial.full_name} maxLength={VALIDATION_LIMITS.nameMax} required />
        <Field label="Email" name="email" type="email" defaultValue={initial.email} maxLength={VALIDATION_LIMITS.emailMax} required />
        <Field label="Display Name" name="display_name" defaultValue={initial.display_name ?? ''} maxLength={VALIDATION_LIMITS.displayNameMax} />
        <Field label="Phone" name="phone" type="tel" inputMode="numeric" maxLength={20} pattern={INPUT_PATTERNS.internationalPhone} title="Enter a valid phone number (7-15 digits, optionally starting with +)" defaultValue={initial.phone ?? ''} />
        <Field
          label="Alternate Phone"
          name="alternate_phone"
          type="tel"
          inputMode="numeric"
          maxLength={20}
          pattern={INPUT_PATTERNS.internationalPhone}
          title="Enter a valid phone number (7-15 digits, optionally starting with +)"
          defaultValue={initial.alternate_phone ?? ''}
        />
        <Field label="City" name="current_city" defaultValue={initial.current_city ?? ''} maxLength={VALIDATION_LIMITS.placeMax} />
        <Field label="State" name="current_state" defaultValue={initial.current_state ?? ''} maxLength={VALIDATION_LIMITS.placeMax} />
        <Field
          label="Country"
          name="current_country"
          defaultValue={initial.current_country ?? 'India'}
          maxLength={VALIDATION_LIMITS.placeMax}
        />
        <Field label="Occupation" name="occupation" defaultValue={initial.occupation ?? ''} maxLength={VALIDATION_LIMITS.professionalTextMax} />
        <Field label="Company" name="company" defaultValue={initial.company ?? ''} maxLength={VALIDATION_LIMITS.professionalTextMax} />
        <Field label="Job Title" name="job_title" defaultValue={initial.job_title ?? ''} maxLength={VALIDATION_LIMITS.professionalTextMax} />
        <Field label="Industry" name="industry" defaultValue={initial.industry ?? ''} maxLength={VALIDATION_LIMITS.industryMax} />
        <Field
          label="LinkedIn URL"
          name="linkedin_url"
          type="url"
          maxLength={VALIDATION_LIMITS.urlMax}
          defaultValue={initial.linkedin_url ?? ''}
        />
        <Field
          label="Website URL"
          name="website_url"
          type="url"
          maxLength={VALIDATION_LIMITS.urlMax}
          defaultValue={initial.website_url ?? ''}
        />
      </div>

      <div>
        <label htmlFor="bio" className={labelClass}>
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={VALIDATION_LIMITS.bioMax}
          defaultValue={initial.bio ?? ''}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
        />
      </div>

      <div>
        <label htmlFor="achievements" className={labelClass}>
          Achievements
        </label>
        <textarea
          id="achievements"
          name="achievements"
          rows={4}
          maxLength={VALIDATION_LIMITS.achievementsMax}
          defaultValue={initial.achievements ?? ''}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
        />
      </div>

      <div className="flex flex-wrap gap-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="hide_email" defaultChecked={initial.hide_email} />
          Hide email in directory
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="hide_phone" defaultChecked={initial.hide_phone} />
          Hide phone in directory
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
