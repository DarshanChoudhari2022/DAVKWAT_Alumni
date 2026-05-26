import { CardSkeleton, PageHeaderSkeleton, Skeleton } from '@/components/shared/Skeleton';

export default function MembershipLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeaderSkeleton />
      <CardSkeleton className="mb-6 h-32" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <CardSkeleton key={i} className="h-48" />
        ))}
      </div>
      <Skeleton className="mt-8 h-40 w-full" />
    </div>
  );
}
