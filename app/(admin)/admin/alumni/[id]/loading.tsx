import { Skeleton } from '@/components/shared/Skeleton';

export default function AlumniDetailAdminLoading() {
  return (
    <div className="mx-auto max-w-4xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <Skeleton className="h-4 w-28 rounded" />
      <Skeleton className="mt-4 h-32 w-full rounded-xl" />
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
