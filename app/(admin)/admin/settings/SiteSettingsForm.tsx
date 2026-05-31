'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

interface SiteSettingsFormProps {
  initial: {
    trustName: string;
    contactEmail: string;
    contactPhone: string;
    aboutShort: string;
    socialLinks: {
      facebook: string;
      twitter: string;
      linkedin: string;
      instagram: string;
    };
  };
}

export function SiteSettingsForm({ initial }: SiteSettingsFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    const payload = {
      trust_name: String(formData.get('trust_name') ?? ''),
      contact_email: String(formData.get('contact_email') ?? ''),
      contact_phone: String(formData.get('contact_phone') ?? ''),
      about_short: String(formData.get('about_short') ?? ''),
      social_links: {
        facebook: String(formData.get('facebook') ?? ''),
        twitter: String(formData.get('twitter') ?? ''),
        linkedin: String(formData.get('linkedin') ?? ''),
        instagram: String(formData.get('instagram') ?? ''),
      },
    };

    startTransition(async () => {
      const response = await fetch('/api/admin/settings/site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Could not save the site settings.');
        return;
      }

      setSuccess('Site settings saved successfully.');
    });
  }

  return (
    <form action={handleSubmit} className="mt-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Trust name</span>
          <input
            name="trust_name"
            defaultValue={initial.trustName}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Contact email</span>
          <input
            name="contact_email"
            type="email"
            defaultValue={initial.contactEmail}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Contact phone</span>
          <input
            name="contact_phone"
            defaultValue={initial.contactPhone}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Short description</span>
        <textarea
          name="about_short"
          defaultValue={initial.aboutShort}
          rows={4}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
        />
      </label>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Social links</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Facebook</span>
            <input
              name="facebook"
              type="url"
              defaultValue={initial.socialLinks.facebook}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Twitter / X</span>
            <input
              name="twitter"
              type="url"
              defaultValue={initial.socialLinks.twitter}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">LinkedIn</span>
            <input
              name="linkedin"
              type="url"
              defaultValue={initial.socialLinks.linkedin}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Instagram</span>
            <input
              name="instagram"
              type="url"
              defaultValue={initial.socialLinks.instagram}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            />
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save site settings'}
      </Button>
    </form>
  );
}
