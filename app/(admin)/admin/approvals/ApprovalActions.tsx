'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { readApiResponse } from '@/lib/utils/api-client';
import { DeleteRejectedAlumniButton } from '../alumni/DeleteRejectedAlumniButton';

interface ApprovalActionsProps {
  alumniId: string;
  alumniName: string;
  canDelete?: boolean;
}

export function ApprovalActions({ alumniId, alumniName, canDelete = false }: ApprovalActionsProps) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [completedAction, setCompletedAction] = useState<'approved' | 'rejected' | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumniId }),
      });
      const data = await readApiResponse<{ error?: string }>(res);
      if (!res.ok) {
        setError(data.error ?? 'Failed to approve.');
      } else {
        setCompletedAction('approved');
        router.refresh();
      }
    });
  }

  function handleReject() {
    if (!reason.trim()) {
      setError('Rejection reason is required.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumniId, reason: reason.trim() }),
      });
      const data = await readApiResponse<{ error?: string }>(res);
      if (!res.ok) {
        setError(data.error ?? 'Failed to reject.');
      } else {
        setCompletedAction('rejected');
        setShowReject(false);
        setReason('');
        router.refresh();
      }
    });
  }

  if (completedAction) {
    return (
      <p className="text-sm font-medium text-emerald-700" role="status">
        {completedAction === 'approved' ? 'Approved' : 'Rejected'}
      </p>
    );
  }

  if (showReject) {
    return (
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[260px]">
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={`Reason for rejecting ${alumniName}…`}
          rows={2}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
        />
        <div className="grid gap-2 sm:flex">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleReject}
            disabled={isPending}
          >
            {isPending ? 'Rejecting…' : 'Confirm Reject'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowReject(false);
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="grid gap-2 sm:flex">
        <Button size="sm" onClick={handleApprove} disabled={isPending} className="w-full sm:w-auto">
          <Check className="h-4 w-4" />
          {isPending ? 'Approving…' : 'Approve'}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowReject(true)}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          <X className="h-4 w-4" />
          Reject
        </Button>
        {canDelete && <DeleteRejectedAlumniButton alumniId={alumniId} />}
      </div>
    </div>
  );
}
