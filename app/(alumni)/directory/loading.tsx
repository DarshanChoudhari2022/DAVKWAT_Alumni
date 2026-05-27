import { CardSkeleton, PageHeaderSkeleton, Skeleton } from '@/components/shared/Skeleton';

export default function DirectoryLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeaderSkeleton />
      <div className="mb-6 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} className="h-36" />
        ))}
      </div>
    </div>
  );
}
