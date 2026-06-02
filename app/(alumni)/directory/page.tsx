import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Search } from 'lucide-react';
import { CardSkeleton } from '@/components/shared/Skeleton';
import { DirectoryListRegion } from './sections/DirectoryListRegion';

export const metadata: Metadata = { title: 'Alumni Directory' };

const COURSES = ['Science', 'Commerce', 'Arts', 'Other'] as const;
const CURRENT_YEAR = new Date().getFullYear();

interface SearchParams {
  q?: string;
  batch?: string;
  course?: string;
  city?: string;
  state?: string;
  country?: string;
  industry?: string;
  sort?: string;
  page?: string;
}

/**
 * Skeleton fallback for the directory list region (grid of card skeletons).
 * Composed from the shared CardSkeleton component (Req 2.3).
 */
function DirectoryListSkeleton() {
  return (
    <div className="mt-8">
      <div className="mb-4">
        <div className="h-4 w-48 animate-pulse rounded bg-slate-200" aria-hidden />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <CardSkeleton className="h-36" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Directory page shell: renders heading + filter form synchronously.
 * The list/pagination is streamed in via Suspense (Req 2.1, 2.2).
 */
export default function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const batchOptions = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Shell: heading */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Alumni Directory</h1>
          <p className="mt-1 text-sm text-slate-500">
            Search by name, company, industry, batch, course, or location
          </p>
        </div>
      </header>

      {/* Shell: filter form (renders synchronously, no data dependency) */}
      <DirectoryFilterForm batchOptions={batchOptions} searchParams={searchParams} />

      {/* Async region: list + pagination, streamed via Suspense */}
      <Suspense fallback={<DirectoryListSkeleton />}>
        <DirectoryListRegion searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/**
 * Filter form rendered synchronously as part of the shell.
 * Uses `use` to unwrap the searchParams promise in the client.
 */
async function DirectoryFilterForm({
  batchOptions,
  searchParams,
}: {
  batchOptions: number[];
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  return (
    <form className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="search">
      <label className="lg:col-span-2">
        <span className="sr-only">Search</span>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="Search by name, company, occupation, industry..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          />
        </div>
      </label>
      <select
        name="batch"
        defaultValue={sp.batch ?? ''}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
      >
        <option value="">All batches</option>
        {batchOptions.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <select
        name="course"
        defaultValue={sp.course ?? ''}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
      >
        <option value="">All courses</option>
        {COURSES.map((course) => (
          <option key={course} value={course}>
            {course}
          </option>
        ))}
      </select>
      <input
        type="text"
        name="city"
        defaultValue={sp.city ?? ''}
        placeholder="City"
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
      />
      <input
        type="text"
        name="state"
        defaultValue={sp.state ?? ''}
        placeholder="State"
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
      />
      <input
        type="text"
        name="country"
        defaultValue={sp.country ?? ''}
        placeholder="Country"
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
      />
      <input
        type="text"
        name="industry"
        defaultValue={sp.industry ?? ''}
        placeholder="Industry"
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
      />
      <select
        name="sort"
        defaultValue={sp.sort ?? 'name_asc'}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
      >
        <option value="name_asc">Sort: Name A-Z</option>
        <option value="batch_desc">Newest batch first</option>
        <option value="batch_asc">Oldest batch first</option>
        <option value="city_asc">City A-Z</option>
        <option value="recent">Recently joined</option>
      </select>
      <div className="lg:col-span-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0F2557] px-5 text-sm font-medium text-white hover:bg-[#0F2557]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F2557]"
        >
          Apply filters
        </button>
        <Link href="/directory" className="text-sm text-slate-500 hover:text-[#0F2557]">
          Clear
        </Link>
      </div>
    </form>
  );
}
