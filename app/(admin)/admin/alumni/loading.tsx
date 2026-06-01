import { PageHeaderSkeleton, Skeleton, TableRowSkeleton } from '@/components/shared/Skeleton';

export default function AdminAlumniLoading() {
  return (
    <div className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <PageHeaderSkeleton />
      <Skeleton className="mb-4 h-10 w-64" />
      <table className="w-full text-sm">
        <tbody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={6} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
