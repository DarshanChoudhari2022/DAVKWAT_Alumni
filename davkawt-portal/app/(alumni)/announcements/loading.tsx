import { CardSkeleton, PageHeaderSkeleton } from '@/components/shared/Skeleton';

export default function AnnouncementsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeaderSkeleton />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
