'use client';

import { useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  isPending?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isPending = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 m-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-black/40"
    >
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'destructive' ? 'destructive' : 'primary'}
          size="sm"
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? 'Processing…' : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
