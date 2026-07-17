import { PageHeaderSkeleton, Skeleton, TableRowSkeleton } from '@/components/shared/Skeleton';

export default function AdminAnnouncementsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <PageHeaderSkeleton />
      <Skeleton className="mb-4 h-10 w-64" />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {['Title', 'Author', 'Status', 'Date', 'Actions'].map((h, index) => (
              <th
                key={h}
                className={`py-3 text-left text-xs uppercase tracking-wide text-slate-500 ${
                  index === 0 ? 'pl-5 pr-4' : index === 4 ? 'pl-4 pr-5' : 'px-4'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={5} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
