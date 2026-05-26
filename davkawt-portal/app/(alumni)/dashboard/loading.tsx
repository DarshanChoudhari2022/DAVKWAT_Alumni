import { StatCardSkeleton, CardSkeleton, PageHeaderSkeleton } from '@/components/shared/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <CardSkeleton className="h-48" />
        <CardSkeleton className="h-48" />
      </div>
    </div>
  );
}
