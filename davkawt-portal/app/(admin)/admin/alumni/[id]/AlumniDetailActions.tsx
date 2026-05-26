'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AlumniDetailActionsProps {
  alumniId: string;
  currentRole: string;
  isActive: boolean;
}

export function AlumniDetailActions({ alumniId, currentRole, isActive }: AlumniDetailActionsProps) {
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
      if (!res.ok) {
        const data = await res.json();
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
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to update status.');
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-3">
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {/* Role selector */}
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-slate-400" />
        <select
          value={role}
          onChange={(e) => handleRoleChange(e.target.value)}
          disabled={isPending}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
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
    </div>
  );
}
