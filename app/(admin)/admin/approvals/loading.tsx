import { CardSkeleton, PageHeaderSkeleton, Skeleton } from '@/components/shared/Skeleton';

export default function ApprovalsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeaderSkeleton />
      <div className="mb-6 flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}
