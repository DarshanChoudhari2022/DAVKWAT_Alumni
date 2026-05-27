import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, MapPin, Briefcase } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/shared/Avatar';
import { Pagination } from '@/components/shared/Pagination';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Alumni Directory' };

const PAGE_SIZE = 24;
const COURSES = ['Science', 'Commerce', 'Arts', 'Other'] as const;
const CURRENT_YEAR = new Date().getFullYear();

interface SearchParams {
  q?: string;
  batch?: string;
  course?: string;
  city?: string;
  page?: string;
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let query = supabase
    .from('profiles')
    .select(
      'id, full_name, batch_year, course, current_city, current_state, occupation, company, avatar_url, hide_email, hide_phone',
      { count: 'exact' }
    )
    .eq('approval_status', 'approved');

  if (sp.q) {
    // Use ilike for broad search across name, company, occupation
    const term = `%${sp.q}%`;
    query = query.or(`full_name.ilike.${term},company.ilike.${term},occupation.ilike.${term}`);
  }
  if (sp.batch) query = query.eq('batch_year', Number(sp.batch));
  if (sp.course) query = query.eq('course', sp.course);
  if (sp.city) query = query.ilike('current_city', `%${sp.city}%`);

  const { data: alumni, count } = await query
    .order('full_name', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // Batch options — last 50 years descending
  const batchOptions = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Alumni Directory</h1>
          <p className="mt-1 text-sm text-slate-500">
            {count ?? 0} alumni · search by name, batch, course, or city
          </p>
        </div>
      </header>

      {/* Filters */}
      <form className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" role="search">
        <label className="lg:col-span-2">
          <span className="sr-only">Search</span>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ''}
              placeholder="Search by name, company, occupation…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            />
          </div>
        </label>
        <select name="batch" defaultValue={sp.batch ?? ''} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]">
          <option value="">All batches</option>
          {batchOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select name="course" defaultValue={sp.course ?? ''} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]">
          <option value="">All courses</option>
          {COURSES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="text"
          name="city"
          defaultValue={sp.city ?? ''}
          placeholder="City"
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
        />
        <div className="lg:col-span-5 flex flex-wrap items-center gap-2">
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

      {/* Results */}
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(alumni ?? []).map((a) => (
          <li key={a.id}>
            <Link href={`/directory/${a.id}`}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start gap-3">
                  <Avatar src={a.avatar_url} name={a.full_name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium">{a.full_name}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="primary">{a.batch_year}</Badge>
                      <Badge variant="default">{a.course}</Badge>
                    </div>
                    {a.occupation && (
                      <p className="mt-2 flex items-center gap-1 truncate text-sm text-slate-600">
                        <Briefcase aria-hidden className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {a.occupation}
                          {a.company ? ` · ${a.company}` : ''}
                        </span>
                      </p>
                    )}
                    {a.current_city && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" />
                        {a.current_city}
                        {a.current_state ? `, ${a.current_state}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          </li>
        ))}
        {(alumni ?? []).length === 0 && (
          <li className="col-span-full">
            <Card className="text-center text-sm text-slate-500">
              No alumni match your filters. Try clearing them.
            </Card>
          </li>
        )}
      </ul>

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/directory"
        searchParams={{
          q: sp.q,
          batch: sp.batch,
          course: sp.course,
          city: sp.city,
        }}
      />
    </div>
  );
}
