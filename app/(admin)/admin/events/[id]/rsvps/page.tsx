import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MobileInfoRow } from '@/components/admin/MobileInfoRow';
import { Avatar } from '@/components/shared/Avatar';
import { requireAdminAccess } from '@/lib/auth/admin-access';
import { formatDate, formatDateTime } from '@/lib/utils/format';
import { EventReminderButton } from './EventReminderButton';

export const metadata: Metadata = { title: 'Event RSVPs - Admin' };

export default async function EventRsvpsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { database: supabase } = await requireAdminAccess();

  const { data: event } = await supabase
    .from('events')
    .select('id, title, starts_at')
    .eq('id', id)
    .single();

  if (!event) notFound();

  const { data: rsvps } = await supabase
    .from('event_rsvps')
    .select('id, registered_at, profiles(id, full_name, email, batch_year, current_city, avatar_url)')
    .eq('event_id', id)
    .order('registered_at', { ascending: false })
    .order('id', { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0F2557]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Events
      </Link>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{event.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatDateTime(event.starts_at)} - {rsvps?.length ?? 0} RSVPs
          </p>
        </div>
        <div className="grid gap-2 sm:flex">
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <a href={`/api/admin/export?type=rsvps&eventId=${id}`}>
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          </Button>
          <EventReminderButton eventId={id} />
        </div>
      </header>

      <div className="mt-6 grid gap-3 sm:hidden">
        {(rsvps ?? []).map((r) => {
          const p =
            r.profiles && !Array.isArray(r.profiles)
              ? (r.profiles as {
                  id: string;
                  full_name: string;
                  email: string;
                  batch_year: number;
                  current_city: string | null;
                  avatar_url: string | null;
                })
              : null;
          if (!p) return null;
          return (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar src={p.avatar_url} name={p.full_name} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.full_name}</p>
                  <p className="break-all text-xs text-slate-500">{p.email}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                <MobileInfoRow label="Batch">{p.batch_year}</MobileInfoRow>
                <MobileInfoRow label="City">{p.current_city ?? '-'}</MobileInfoRow>
                <MobileInfoRow label="Registered">{formatDate(r.registered_at)}</MobileInfoRow>
              </div>
            </Card>
          );
        })}
        {(rsvps ?? []).length === 0 && (
          <Card className="text-center text-sm text-slate-500">No RSVPs yet.</Card>
        )}
      </div>

      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white sm:block">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2 pr-3">Alumni</th>
              <th className="pb-2 pr-3">Batch</th>
              <th className="pb-2 pr-3">City</th>
              <th className="pb-2">Registered</th>
            </tr>
          </thead>
          <tbody>
            {(rsvps ?? []).map((r) => {
              const p =
                r.profiles && !Array.isArray(r.profiles)
                  ? (r.profiles as {
                      id: string;
                      full_name: string;
                      email: string;
                      batch_year: number;
                      current_city: string | null;
                      avatar_url: string | null;
                    })
                  : null;
              if (!p) return null;
              return (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <Avatar src={p.avatar_url} name={p.full_name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.full_name}</p>
                        <p className="truncate text-xs text-slate-500">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">{p.batch_year}</td>
                  <td className="py-3 pr-3">{p.current_city ?? '-'}</td>
                  <td className="py-3">{formatDate(r.registered_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
