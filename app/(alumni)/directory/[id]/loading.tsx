import { Skeleton } from '@/components/shared/Skeleton';

export default function DirectoryDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-28 rounded" />
      <div className="mt-6 flex items-start gap-4">
        <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-7 w-48 rounded" />
          <Skeleton className="mt-2 h-4 w-32 rounded" />
        </div>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
}
