import Link from 'next/link';
import { MapPin, Briefcase } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/shared/Avatar';
import { Pagination } from '@/components/shared/Pagination';
import { SectionError } from '@/components/shared/SectionError';
import { requireAlumniAccess } from '@/lib/auth/alumni-access';
import { getListCount, formatCount } from '@/lib/db/estimated-count';
import { computePagination } from '@/lib/db/pagination';
import { escapeIlikePattern, normalizeSearchTerm } from '@/lib/utils/search';
import type { EstimateFilter } from '@/lib/db/estimated-count';

const PAGE_SIZE = 24;

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
 * Build structured filters for the estimate_filtered_count RPC.
 * Must mirror the Supabase query filters applied to the list query.
 */
function buildDirectoryFilters(sp: SearchParams): EstimateFilter[] {
  const filters: EstimateFilter[] = [
    { column: 'approval_status', op: 'eq', value: 'approved' },
    { column: 'is_active', op: 'eq', value: 'true' },
  ];

  if (sp.q) {
    const search = normalizeSearchTerm(sp.q);
    if (search) {
      const term = `%${escapeIlikePattern(search)}%`;
      // The ilike filter is applied as OR across multiple columns in the actual query.
      // For estimation purposes, we use the first searchable column as an approximation.
      filters.push({ column: 'full_name', op: 'ilike', value: term });
    }
  }
  if (sp.batch) filters.push({ column: 'batch_year', op: 'eq', value: String(sp.batch) });
  if (sp.course) filters.push({ column: 'course', op: 'eq', value: sp.course });
  if (sp.city) {
    filters.push({ column: 'current_city', op: 'ilike', value: `%${escapeIlikePattern(sp.city)}%` });
  }
  if (sp.state) {
    filters.push({ column: 'current_state', op: 'ilike', value: `%${escapeIlikePattern(sp.state)}%` });
  }
  if (sp.country) {
    filters.push({ column: 'current_country', op: 'ilike', value: `%${escapeIlikePattern(sp.country)}%` });
  }
  if (sp.industry) {
    filters.push({ column: 'industry', op: 'ilike', value: `%${escapeIlikePattern(sp.industry)}%` });
  }

  return filters;
}

/**
 * Async server component: directory list + pagination region.
 * Wrapped in Suspense by the parent page shell (Req 2.1, 2.2, 2.5).
 * Handles its own errors with a scoped error block (Req 2.6).
 */
export async function DirectoryListRegion({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  try {
    // Memoized auth — no redundant getUser() (Req 1.1, 1.2)
    const { database: supabase } = await requireAlumniAccess();

    const sp = await searchParams;
    const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    // Build the list query (without count: 'exact' — uses estimated count instead)
    let query = supabase
      .from('profiles')
      .select(
        'id, full_name, batch_year, course, current_city, current_state, current_country, occupation, company, industry, avatar_url'
      )
      .eq('approval_status', 'approved')
      .eq('is_active', true);

    // Apply search filters
    if (sp.q) {
      const search = normalizeSearchTerm(sp.q);
      if (search) {
        const term = `%${escapeIlikePattern(search)}%`;
        query = query.or(
          `full_name.ilike.${term},company.ilike.${term},occupation.ilike.${term},industry.ilike.${term}`
        );
      }
    }
    if (sp.batch) query = query.eq('batch_year', Number(sp.batch));
    if (sp.course) query = query.eq('course', sp.course);
    if (sp.city) query = query.ilike('current_city', `%${escapeIlikePattern(sp.city)}%`);
    if (sp.state) query = query.ilike('current_state', `%${escapeIlikePattern(sp.state)}%`);
    if (sp.country) query = query.ilike('current_country', `%${escapeIlikePattern(sp.country)}%`);
    if (sp.industry) query = query.ilike('industry', `%${escapeIlikePattern(sp.industry)}%`);

    // Apply deterministic ordering with id tie-breaker (Req 5.1, 5.2)
    if (sp.sort === 'batch_desc') {
      query = query
        .order('batch_year', { ascending: false })
        .order('full_name', { ascending: true })
        .order('id', { ascending: true });
    } else if (sp.sort === 'batch_asc') {
      query = query
        .order('batch_year', { ascending: true })
        .order('full_name', { ascending: true })
        .order('id', { ascending: true });
    } else if (sp.sort === 'city_asc') {
      query = query
        .order('current_city', { ascending: true, nullsFirst: false })
        .order('full_name', { ascending: true })
        .order('id', { ascending: true });
    } else if (sp.sort === 'recent') {
      query = query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
    } else {
      // Default: name_asc — deterministic with id tie-breaker
      query = query
        .order('full_name', { ascending: true })
        .order('id', { ascending: true });
    }

    // Execute list query + estimated count concurrently (Req 2.4, 4.1, 4.5)
    const [{ data: alumni }, countResult] = await Promise.all([
      query.range(offset, offset + PAGE_SIZE - 1),
      getListCount(supabase, {
        table: 'profiles',
        filters: buildDirectoryFilters(sp),
        exactFallback: () =>
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('approval_status', 'approved')
            .eq('is_active', true) as unknown as PromiseLike<{ count: number | null }>,
      }),
    ]);

    // Pagination math using computePagination (Req 4.2)
    const { totalPages } = computePagination({
      rowsReturned: alumni?.length ?? 0,
      pageSize: PAGE_SIZE,
      page,
      estimate: countResult.count,
    });

    // Display count with formatCount — approximate indicator for estimated values (Req 4.3)
    const displayCount = formatCount(countResult);

    return (
      <div className="mt-8">
        <p className="mb-4 text-sm text-slate-500">
          {displayCount} alumni found
        </p>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  } catch {
    // Scoped error: shell preserved, only this region shows error (Req 2.6)
    return (
      <SectionError
        title="Couldn't load the directory."
        message="Please refresh the page to try again."
        className="mt-8"
      />
    );
  }
}
