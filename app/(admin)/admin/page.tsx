import type { Metadata } from 'next';
import Link from 'next/link';
import { Users, UserCheck, CreditCard, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatINR, formatDate } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Admin Dashboard' };

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [totalAlumni, pendingApprovals, paidMembers, totalRevenue, recentRegistrations] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'approved'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_paid_member', true),
      supabase
        .from('payments')
        .select('amount')
        .eq('status', 'success'),
      supabase
        .from('profiles')
        .select('id, full_name, batch_year, course, approval_status, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

  const revenue = (totalRevenue.data ?? []).reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Overview of the DAVKAWT Alumni Portal.</p>

      {/* Stats grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Alumni"
          value={String(totalAlumni.count ?? 0)}
          href="/admin/alumni"
        />
        <StatCard
          icon={UserCheck}
          label="Pending Approvals"
          value={String(pendingApprovals.count ?? 0)}
          href="/admin/approvals"
          highlight={(pendingApprovals.count ?? 0) > 0}
        />
        <StatCard
          icon={CreditCard}
          label="Paid Members"
          value={String(paidMembers.count ?? 0)}
          href="/admin/payments"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Revenue"
          value={formatINR(revenue)}
          href="/admin/payments"
        />
      </div>

      {/* Recent registrations */}
      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold">Recent Registrations</h2>
          <Link href="/admin/approvals" className="text-sm text-[#0F2557] hover:underline">
            View all &rarr;
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Batch</th>
                <th className="pb-2 pr-4">Course</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2">Registered</th>
              </tr>
            </thead>
            <tbody>
              {(recentRegistrations.data ?? []).map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 font-medium">{r.full_name}</td>
                  <td className="py-3 pr-4">{r.batch_year}</td>
                  <td className="py-3 pr-4">{r.course}</td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={
                        r.approval_status === 'approved'
                          ? 'success'
                          : r.approval_status === 'rejected'
                            ? 'error'
                            : 'warning'
                      }
                    >
                      {r.approval_status}
                    </Badge>
                  </td>
                  <td className="py-3">{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  highlight = false,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Card
        className={`transition-all hover:-translate-y-0.5 hover:shadow-md ${
          highlight ? 'border-rose-200 bg-rose-50/50' : ''
        }`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F2557]/5 text-[#0F2557]">
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-4 font-display text-3xl font-semibold">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{label}</p>
      </Card>
    </Link>
  );
}
