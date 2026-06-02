import { CardSkeleton, StatCardSkeleton, TableRowSkeleton } from '@/components/shared/Skeleton';
import { cn } from '@/lib/utils/cn';

/**
 * Shared scaffolding for the admin streaming page pattern (Req 3.1–3.7, 5.5, 7.5).
 *
 * The standard per-page structure these helpers support:
 *
 * ```tsx
 * export default function Page({ searchParams }: Props) {
 *   return (
 *     <div className="...page container...">
 *       <PageHeader />                                  // shell, no await (Req 3.1, 3.5)
 *       <Suspense fallback={<StatsGridSkeleton count={3} />}>
 *         <StatsRegion searchParams={searchParams} />   // cached Aggregate_Data
 *       </Suspense>
 *       <FilterForm />                                  // shell
 *       <Suspense fallback={<TableSkeleton rows={10} cols={6} />}>
 *         <ListRegion searchParams={searchParams} />    // List_Query + estimated count
 *       </Suspense>
 *     </div>
 *   );
 * }
 *
 * // Region component: concurrent queries + region-local try/catch (Req 3.4, 3.7, 5.5)
 * async function StatsRegion({ searchParams }: { searchParams: Promise<SearchParams> }) {
 *   try {
 *     const [a, b, c] = await Promise.all([queryA(), queryB(), queryC()]);
 *     return <StatsContent a={a} b={b} c={c} />;
 *   } catch {
 *     return <SectionError />;
 *   }
 * }
 * ```
 *
 * These helpers only compose the existing `StatCardSkeleton` / `TableRowSkeleton`
 * from `components/shared/Skeleton.tsx`; they do not redefine skeleton primitives.
 */

interface StatsGridSkeletonProps {
  /** Number of stat-card placeholders to render. */
  count: number;
  /**
   * Tailwind grid classes for the wrapper. Defaults to the layout used by the
   * dashboard/payments stat grids. Override to match a specific page.
   */
  className?: string;
}

/**
 * Fallback for a stats region: a responsive grid of {@link StatCardSkeleton}.
 * Pass `count` to match the number of stat cards the region renders.
 */
export function StatsGridSkeleton({
  count,
  className = 'mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
}: StatsGridSkeletonProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  /** Number of placeholder rows. */
  rows: number;
  /** Number of columns per row (matches the table's column count). */
  cols: number;
  /** Tailwind classes for the wrapping table element. */
  className?: string;
}

/**
 * Fallback for a list region: a table of {@link TableRowSkeleton} rows.
 * Mirrors the table markup used by the admin list pages so the skeleton lines
 * up with the resolved content it replaces (Req 3.2, 3.6).
 */
export function TableSkeleton({ rows, cols, className }: TableSkeletonProps) {
  return (
    <div className={cn('mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white', className)}>
      <table className="w-full text-sm">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ListSkeletonProps {
  /** Number of placeholder rows / cards. */
  rows: number;
  /** Number of table columns on the desktop layout. */
  cols: number;
  /** Tailwind classes for the desktop table wrapper. */
  className?: string;
}

/**
 * Fallback for the admin list pages that use the responsive
 * mobile-cards + desktop-table layout (payments, alumni, approvals,
 * announcements, events, forum). Composes {@link CardSkeleton} for the
 * `sm:hidden` mobile view and {@link TableRowSkeleton} for the desktop table,
 * matching the resolved content's two-view structure (Req 3.2, 3.6).
 */
export function ListSkeleton({ rows, cols, className }: ListSkeletonProps) {
  return (
    <>
      <div className="mt-6 grid gap-3 sm:hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className={cn('mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white sm:block', className)}>
        <table className="w-full text-sm">
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
