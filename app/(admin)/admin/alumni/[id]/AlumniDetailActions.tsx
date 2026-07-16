'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Trash2, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { readApiResponse } from '@/lib/utils/api-client';

interface AlumniDetailActionsProps {
  alumniId: string;
  canDelete: boolean;
  currentRole: string;
  isActive: boolean;
}

export function AlumniDetailActions({
  alumniId,
  canDelete,
  currentRole,
  isActive,
}: AlumniDetailActionsProps) {
  const [role, setRole] = useState(currentRole);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRoleChange(newRole: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/admin/alumni/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumniId, role: newRole }),
      });
      const data = await readApiResponse<{ error?: string }>(res);
      if (!res.ok) {
        setError(data.error ?? 'Failed to change role.');
      } else {
        setRole(newRole);
        router.refresh();
      }
    });
  }

  function handleToggleActive() {
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/admin/alumni/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumniId, is_active: !isActive }),
      });
      const data = await readApiResponse<{ error?: string }>(res);
      if (!res.ok) {
        setError(data.error ?? 'Failed to update status.');
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    const adminPassword = window.prompt(
      'Enter the admin password to permanently delete this alumni record.'
    );
    if (!adminPassword) return;

    const confirmed = window.confirm(
      'This permanently deletes the alumni login, profile, documents, payments, RSVPs, and related records. This cannot be undone.'
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/alumni/${alumniId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword }),
      });
      const data = await readApiResponse<{ error?: string }>(res);
      if (!res.ok) {
        setError(data.error ?? 'Failed to delete alumni record.');
      } else {
        router.replace('/admin/alumni');
        router.refresh();
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {/* Role selector */}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Shield className="h-4 w-4 text-slate-400" />
        <select
          value={role}
          onChange={(e) => handleRoleChange(e.target.value)}
          disabled={isPending}
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557] sm:flex-none"
        >
          <option value="pending">Pending</option>
          <option value="alumni">Alumni</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
      </div>

      {/* Toggle active */}
      <Button
        size="sm"
        variant={isActive ? 'destructive' : 'primary'}
        onClick={handleToggleActive}
        disabled={isPending}
        className="w-full sm:w-auto"
      >
        {isActive ? (
          <>
            <UserX className="h-4 w-4" />
            Deactivate
          </>
        ) : (
          <>
            <UserCheck className="h-4 w-4" />
            Reactivate
          </>
        )}
      </Button>

      {canDelete && (
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          <Trash2 className="h-4 w-4" />
          Delete Permanently
        </Button>
      )}
    </div>
  );
}
