import { CardSkeleton, PageHeaderSkeleton, Skeleton, TableRowSkeleton } from '@/components/shared/Skeleton';

export default function AdminForumLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeaderSkeleton />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} className="h-16" />
        ))}
      </div>
      <Skeleton className="mt-10 mb-4 h-6 w-40" />
      <table className="w-full text-sm">
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={5} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
