import type { Metadata } from 'next';
import { Download, Users, CreditCard, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/utils/format';
import { ReportsCharts } from './ReportsCharts';

export const metadata: Metadata = { title: 'Reports & Exports — Admin' };

export default async function AdminReportsPage() {
  const supabase = await createClient();

  // Aggregate stats
  const [totalRes, paidRes, revenueRes, alumniByBatch, alumniByState, paymentsByMonth] =
    await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_paid_member', true),
      supabase.from('payments').select('amount').eq('status', 'success'),
      supabase
        .from('profiles')
        .select('batch_year')
        .eq('approval_status', 'approved')
        .order('batch_year', { ascending: true }),
      supabase
        .from('profiles')
        .select('current_state')
        .eq('approval_status', 'approved'),
      supabase
        .from('payments')
        .select('amount, created_at')
        .eq('status', 'success')
        .order('created_at', { ascending: true }),
    ]);

  const totalRevenue = (revenueRes.data ?? []).reduce(
    (s: number, p: { amount: number }) => s + Number(p.amount),
    0
  );

  // Batch distribution data
  const batchMap = new Map<number, number>();
  for (const row of alumniByBatch.data ?? []) {
    const yr = (row as { batch_year: number }).batch_year;
    batchMap.set(yr, (batchMap.get(yr) ?? 0) + 1);
  }
  const batchChartData = Array.from(batchMap.entries())
    .map(([year, count]) => ({ year: String(year), count }))
    .slice(-20); // Last 20 batches

  // State distribution
  const stateMap = new Map<string, number>();
  for (const row of alumniByState.data ?? []) {
    const state = (row as { current_state: string | null }).current_state ?? 'Unknown';
    stateMap.set(state, (stateMap.get(state) ?? 0) + 1);
  }
  const stateChartData = Array.from(stateMap.entries())
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Monthly payments
  const monthMap = new Map<string, number>();
  for (const row of paymentsByMonth.data ?? []) {
    const r = row as { amount: number; created_at: string };
    const month = r.created_at.slice(0, 7); // YYYY-MM
    monthMap.set(month, (monthMap.get(month) ?? 0) + Number(r.amount));
  }
  const paymentChartData = Array.from(monthMap.entries())
    .map(([month, amount]) => ({ month, amount }))
    .slice(-12);

  // Conversion rate
  const totalAlumni = totalRes.count ?? 0;
  const paidAlumni = paidRes.count ?? 0;
  const conversionRate = totalAlumni > 0 ? ((paidAlumni / totalAlumni) * 100).toFixed(1) : '0';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Reports & Exports</h1>
      <p className="mt-1 text-sm text-slate-500">Analytics and data exports for the portal.</p>

      {/* Summary stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Total Alumni</p>
          <p className="mt-1 font-display text-2xl font-semibold">{totalAlumni}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Paid Members</p>
          <p className="mt-1 font-display text-2xl font-semibold">{paidAlumni}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Conversion Rate</p>
          <p className="mt-1 font-display text-2xl font-semibold">{conversionRate}%</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatINR(totalRevenue)}</p>
        </Card>
      </div>

      {/* Charts */}
      <ReportsCharts
        batchData={batchChartData}
        stateData={stateChartData}
        paymentData={paymentChartData}
      />

      {/* Export cards */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Export Data</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExportCard
            icon={Users}
            title="Alumni Directory"
            description="Export all approved alumni with contact, academic, and professional details."
            href="/api/admin/export?type=alumni&status=approved"
          />
          <ExportCard
            icon={CreditCard}
            title="Payment Records"
            description="Export all successful payments with transaction details."
            href="/api/admin/export?type=payments&status=success"
          />
          <ExportCard
            icon={Calendar}
            title="Event RSVPs"
            description="Export attendee list for a specific event."
            href="/admin/events"
            note="Go to Events → Select event → RSVPs → Export"
          />
        </div>
      </section>
    </div>
  );
}

function ExportCard({
  icon: Icon,
  title,
  description,
  href,
  note,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  href: string;
  note?: string;
}) {
  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F2557]/5 text-[#0F2557]">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-3 font-display font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
        {note && <p className="mt-2 text-xs italic text-slate-400">{note}</p>}
      </div>
      {!note && (
        <div className="mt-4 flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={href}>
              <Download className="h-4 w-4" />
              CSV
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`${href}&format=xlsx`}>
              <Download className="h-4 w-4" />
              Excel
            </a>
          </Button>
        </div>
      )}
    </Card>
  );
}
