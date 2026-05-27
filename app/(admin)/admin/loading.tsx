import { StatCardSkeleton, PageHeaderSkeleton, Skeleton } from '@/components/shared/Skeleton';

export default function AdminDashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="mt-8 h-64 w-full rounded-xl" />
    </div>
  );
}
