'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function MembershipPlanForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get('name') as string,
      description: form.get('description') as string,
      amount: Number(form.get('amount')),
      membership_type: form.get('membership_type') as string,
      duration_months: form.get('duration_months') ? Number(form.get('duration_months')) : null,
      is_active: true,
    };

    startTransition(async () => {
      const res = await fetch('/api/admin/settings/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to create plan.');
      } else {
        setSuccess(true);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="plan-name" className="block text-sm font-medium text-slate-700">
          Plan Name *
        </label>
        <input
          id="plan-name"
          name="name"
          required
          className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          placeholder="e.g. Lifetime Membership"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="plan-desc" className="block text-sm font-medium text-slate-700">
          Description
        </label>
        <input
          id="plan-desc"
          name="description"
          className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          placeholder="Brief description of the plan"
        />
      </div>

      <div>
        <label htmlFor="plan-amount" className="block text-sm font-medium text-slate-700">
          Amount (₹) *
        </label>
        <input
          id="plan-amount"
          name="amount"
          type="number"
          min="1"
          required
          className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          placeholder="e.g. 5000"
        />
      </div>

      <div>
        <label htmlFor="plan-type" className="block text-sm font-medium text-slate-700">
          Membership Type *
        </label>
        <select
          id="plan-type"
          name="membership_type"
          required
          className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="lifetime">Lifetime</option>
          <option value="annual">Annual</option>
        </select>
      </div>

      <div>
        <label htmlFor="plan-duration" className="block text-sm font-medium text-slate-700">
          Duration (months)
        </label>
        <input
          id="plan-duration"
          name="duration_months"
          type="number"
          min="1"
          className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          placeholder="Leave empty for lifetime"
        />
      </div>

      <div className="flex items-end sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating…' : 'Create Plan'}
        </Button>
      </div>

      {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
      {success && <p className="text-sm text-emerald-600 sm:col-span-2">Plan created successfully!</p>}
    </form>
  );
}
