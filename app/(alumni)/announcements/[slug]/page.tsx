import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';
import { sanitizeHtml, stripHtml } from '@/lib/utils/sanitize';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('announcements')
    .select('title, content')
    .eq('slug', slug)
    .single();
  return {
    title: data?.title ?? 'Announcement',
    description: data?.content ? stripHtml(data.content).slice(0, 200) : undefined,
  };
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: a } = await supabase
    .from('announcements')
    .select('id, title, content, is_pinned, published_at')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!a) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/announcements" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0F2557]">
        <ArrowLeft aria-hidden className="h-4 w-4" /> Back to announcements
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          {a.is_pinned && (
            <Badge variant="warning" className="inline-flex items-center gap-1">
              <Pin aria-hidden className="h-3 w-3" /> Pinned
            </Badge>
          )}
          <span className="text-xs text-slate-500">
            {a.published_at ? formatDate(a.published_at) : 'Draft'}
          </span>
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{a.title}</h1>
      </header>

      <Card className="mt-6 p-6 sm:p-8">
        <div
          className="prose prose-slate max-w-none text-base leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.content) }}
        />
      </Card>
    </article>
  );
}
