'use client';

import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { readApiResponse } from '@/lib/utils/api-client';

interface AdminCandidate {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export function AdminRoleManager({ candidates }: { candidates: AdminCandidate[] }) {
  const [selectedId, setSelectedId] = useState(candidates[0]?.id ?? '');
  const [role, setRole] = useState<'alumni' | 'admin' | 'super_admin'>('admin');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) {
      setError('Select a member first.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch('/api/admin/alumni/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumniId: selectedId, role }),
      });
      const data = await readApiResponse<{ error?: string }>(response);
      if (!response.ok) {
        setError(data.error ?? 'Could not update admin role.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
      {error && <p className="text-sm text-rose-600 md:col-span-3">{error}</p>}
      <select
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
      >
        {candidates.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.full_name} - {candidate.email} ({candidate.role})
          </option>
        ))}
      </select>
      <select
        value={role}
        onChange={(event) => setRole(event.target.value as 'alumni' | 'admin' | 'super_admin')}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
      >
        <option value="admin">Admin</option>
        <option value="super_admin">Super Admin</option>
        <option value="alumni">Remove Admin</option>
      </select>
      <Button type="submit" loading={isPending} disabled={candidates.length === 0}>
        <ShieldCheck className="h-4 w-4" />
        Update Role
      </Button>
    </form>
  );
}
