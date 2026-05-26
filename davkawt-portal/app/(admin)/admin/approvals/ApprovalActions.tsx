'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ApprovalActionsProps {
  alumniId: string;
  alumniName: string;
}

export function ApprovalActions({ alumniId, alumniName }: ApprovalActionsProps) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to approve.');
      } else {
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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to reject.');
      } else {
        setShowReject(false);
        setReason('');
        router.refresh();
      }
    });
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
        <div className="flex gap-2">
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
    <div className="flex shrink-0 flex-col items-end gap-2">
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleApprove} disabled={isPending}>
          <Check className="h-4 w-4" />
          {isPending ? 'Approving…' : 'Approve'}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowReject(true)}
          disabled={isPending}
        >
          <X className="h-4 w-4" />
          Reject
        </Button>
      </div>
    </div>
  );
}
