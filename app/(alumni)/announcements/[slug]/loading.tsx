import { Skeleton } from '@/components/shared/Skeleton';

export default function AnnouncementDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-28 rounded" />
      <Skeleton className="mt-4 h-8 w-3/4 rounded" />
      <Skeleton className="mt-3 h-3 w-32 rounded" />
      <Skeleton className="mt-6 h-4 w-full rounded" />
      <Skeleton className="mt-2 h-4 w-5/6 rounded" />
      <Skeleton className="mt-2 h-4 w-4/5 rounded" />
      <Skeleton className="mt-2 h-4 w-2/3 rounded" />
    </div>
  );
}
