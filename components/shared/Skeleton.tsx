import { cn } from '@/lib/utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-slate-200', className)}
      aria-hidden
    />
  );
}

export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-xl border border-slate-100 bg-white p-5', className)}>
      <Skeleton className="mb-3 h-4 w-2/3" />
      <Skeleton className="mb-2 h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 pr-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5">
      <Skeleton className="mb-2 h-3 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6">
      <Skeleton className="mb-2 h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}
