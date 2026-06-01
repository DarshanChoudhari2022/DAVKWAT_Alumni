import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function MobileInfoRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 text-sm', className)}>
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="min-w-0 text-right text-slate-700">{children}</div>
    </div>
  );
}
