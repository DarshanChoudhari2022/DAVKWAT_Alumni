import { StatCardSkeleton, PageHeaderSkeleton, Skeleton, TableRowSkeleton } from '@/components/shared/Skeleton';

export default function AdminPaymentsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="mt-6 mb-4 h-10 w-64" />
      <table className="mt-4 w-full text-sm">
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={6} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
