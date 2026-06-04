import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CardSkeleton } from '@/components/shared/Skeleton';
import { SectionError } from '@/components/shared/SectionError';
import { createClient } from '@/lib/supabase/server';
import { formatRelative } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Forum' };

/**
 * Forum page — shell renders synchronously (heading); categories and threads
 * stream independently inside separate Suspense boundaries (Req 2.1, 2.3).
 * No estimated counts — shows all active categories without pagination (Req 9.2).
 */
export default function ForumPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Forum</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect with fellow alumni. Ask questions, share experiences, and stay in touch.
        </p>
      </header>

      {/* Categories region */}
      <Suspense
        fallback={
          <ul className="mt-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <CardSkeleton />
              </li>
            ))}
          </ul>
        }
      >
        <CategoriesRegion />
      </Suspense>

      {/* Threads region — concurrent with categories (Req 2.3, 2.4) */}
      <Suspense
        fallback={
          <div className="mt-8 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <ThreadsRegion />
      </Suspense>
    </div>
  );
}

/**
 * Categories region (Req 2.2, 2.6, 5.3): fetches active categories with
 * deterministic ordering (display_order + id tie-breaker) and thread stats
 * concurrently via Promise.all. Region-local try/catch renders a scoped error
 * block instead of throwing (shell preserved).
 */
async function CategoriesRegion() {
  try {
    const supabase = await createClient();

    // Issue categories query and thread stats concurrently within this region
    const [{ data: categories }, { data: threadStats }] = await Promise.all([
      supabase
        .from('forum_categories')
        .select('id, name, description, slug, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('id', { ascending: true }),
      supabase
        .from('forum_threads')
        .select('category_id, id, created_at')
        .order('created_at', { ascending: false }),
    ]);

    // Aggregate stats per category
    const statsMap = new Map<string, { count: number; lastActivity: string | null }>();
    for (const t of threadStats ?? []) {
      const existing = statsMap.get(t.category_id);
      if (!existing) {
        statsMap.set(t.category_id, { count: 1, lastActivity: t.created_at });
      } else {
        existing.count += 1;
      }
    }

    return (
      <ul className="mt-8 space-y-3">
        {(categories ?? []).map((cat) => {
          const stats = statsMap.get(cat.id);
          return (
            <li key={cat.id}>
              <Link href={`/forum/${cat.slug}`}>
                <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0F2557]/5 text-[#0F2557]">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-lg font-semibold">{cat.name}</h2>
                      {cat.description && (
                        <p className="mt-0.5 text-sm text-slate-500">{cat.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {stats?.count ?? 0} threads
                        </span>
                        {stats?.lastActivity && (
                          <span>Last activity {formatRelative(stats.lastActivity)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
        {(categories ?? []).length === 0 && (
          <li>
            <Card className="text-center text-sm text-slate-500">
              No forum categories yet. Check back soon!
            </Card>
          </li>
        )}
      </ul>
    );
  } catch {
    return <SectionError title="Couldn't load categories." />;
  }
}

/**
 * Threads region (Req 2.2, 2.3, 2.6): fetches recent threads across all
 * categories. This region is in a separate Suspense boundary so it streams
 * independently and concurrently with the categories region. Region-local
 * try/catch renders a scoped error block on failure (shell preserved).
 */
async function ThreadsRegion() {
  try {
    const supabase = await createClient();

    const { data: threads } = await supabase
      .from('forum_threads')
      .select('id, title, created_at, category_id, profiles!forum_threads_author_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(10);

    if (!threads || threads.length === 0) {
      return null;
    }

    return (
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Recent Threads</h2>
        <ul className="mt-4 space-y-3">
          {threads.map((t) => {
            const authorName =
              t.profiles && !Array.isArray(t.profiles)
                ? (t.profiles as { full_name: string }).full_name
                : 'Unknown';
            return (
              <li key={t.id}>
                <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium">{t.title}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        by {authorName} · {formatRelative(t.created_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
    );
  } catch {
    return <SectionError title="Couldn't load recent threads." />;
  }
}
