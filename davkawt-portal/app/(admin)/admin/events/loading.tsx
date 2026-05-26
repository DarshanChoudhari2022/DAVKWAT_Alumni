import { CardSkeleton, PageHeaderSkeleton, Skeleton } from '@/components/shared/Skeleton';

export default function AdminEventsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeaderSkeleton />
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} className="h-36" />
        ))}
      </div>
    </div>
  );
}
