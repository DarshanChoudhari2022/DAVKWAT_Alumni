import { Skeleton } from '@/components/shared/Skeleton';

export default function EventDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-28 rounded" />
      <Skeleton className="mt-4 h-8 w-3/4 rounded" />
      <Skeleton className="mt-6 h-48 w-full rounded-xl" />
      <Skeleton className="mt-6 h-4 w-full rounded" />
      <Skeleton className="mt-2 h-4 w-5/6 rounded" />
      <Skeleton className="mt-2 h-4 w-2/3 rounded" />
    </div>
  );
}
