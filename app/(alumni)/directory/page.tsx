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
  state?: string;
  country?: string;
  industry?: string;
  sort?: string;
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
      'id, full_name, batch_year, course, current_city, current_state, current_country, occupation, company, industry, avatar_url',
      { count: 'exact' }
    )
    .eq('approval_status', 'approved')
    .eq('is_active', true);

  if (sp.q) {
    const term = `%${sp.q}%`;
    query = query.or(
      `full_name.ilike.${term},company.ilike.${term},occupation.ilike.${term},industry.ilike.${term}`
    );
  }
  if (sp.batch) query = query.eq('batch_year', Number(sp.batch));
  if (sp.course) query = query.eq('course', sp.course);
  if (sp.city) query = query.ilike('current_city', `%${sp.city}%`);
  if (sp.state) query = query.ilike('current_state', `%${sp.state}%`);
  if (sp.country) query = query.ilike('current_country', `%${sp.country}%`);
  if (sp.industry) query = query.ilike('industry', `%${sp.industry}%`);

  if (sp.sort === 'batch_desc') {
    query = query
      .order('batch_year', { ascending: false })
      .order('full_name', { ascending: true });
  } else if (sp.sort === 'batch_asc') {
    query = query.order('batch_year', { ascending: true }).order('full_name', { ascending: true });
  } else if (sp.sort === 'city_asc') {
    query = query
      .order('current_city', { ascending: true, nullsFirst: false })
      .order('full_name', { ascending: true });
  } else if (sp.sort === 'recent') {
    query = query.order('created_at', { ascending: false });
  } else {
    query = query.order('full_name', { ascending: true });
  }

  const { data: alumni, count } = await query.range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const batchOptions = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Alumni Directory</h1>
          <p className="mt-1 text-sm text-slate-500">
            {count ?? 0} alumni · search by name, company, industry, batch, course, or location
          </p>
        </div>
      </header>

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

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(alumni ?? []).map((alumnus) => (
          <li key={alumnus.id}>
            <Link href={`/directory/${alumnus.id}`}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start gap-3">
                  <Avatar src={alumnus.avatar_url} name={alumnus.full_name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium">{alumnus.full_name}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="primary">{alumnus.batch_year}</Badge>
                      <Badge variant="default">{alumnus.course}</Badge>
                    </div>
                    {(alumnus.occupation || alumnus.company) && (
                      <p className="mt-2 flex items-center gap-1 truncate text-sm text-slate-600">
                        <Briefcase aria-hidden className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {alumnus.occupation ?? 'Professional'}
                          {alumnus.company ? ` · ${alumnus.company}` : ''}
                        </span>
                      </p>
                    )}
                    {(alumnus.current_city || alumnus.current_state || alumnus.current_country) && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" />
                        {[alumnus.current_city, alumnus.current_state, alumnus.current_country]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                    {alumnus.industry && (
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                        {alumnus.industry}
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
          state: sp.state,
          country: sp.country,
          industry: sp.industry,
          sort: sp.sort,
        }}
      />
    </div>
  );
}
