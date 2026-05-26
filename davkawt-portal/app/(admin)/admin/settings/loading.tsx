import { CardSkeleton, PageHeaderSkeleton, Skeleton } from '@/components/shared/Skeleton';

export default function AdminSettingsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeaderSkeleton />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="mt-8 h-48 w-full rounded-xl" />
    </div>
  );
}
