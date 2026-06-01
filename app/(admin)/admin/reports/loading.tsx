import { StatCardSkeleton, PageHeaderSkeleton, Skeleton } from '@/components/shared/Skeleton';

export default function AdminReportsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="col-span-full h-72 rounded-xl" />
      </div>
    </div>
  );
}
