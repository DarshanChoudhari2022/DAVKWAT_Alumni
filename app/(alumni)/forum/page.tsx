import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatRelative } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Forum' };

export default async function ForumPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('forum_categories')
    .select('id, name, description, slug, display_order')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  // Get thread counts and latest activity per category
  const categoryIds = (categories ?? []).map((c) => c.id);
  const { data: threadStats } = await supabase
    .from('forum_threads')
    .select('category_id, id, created_at')
    .in('category_id', categoryIds.length > 0 ? categoryIds : ['__none__'])
    .order('created_at', { ascending: false });

  // Aggregate stats
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
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Forum</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect with fellow alumni. Ask questions, share experiences, and stay in touch.
        </p>
      </header>

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
    </div>
  );
}
