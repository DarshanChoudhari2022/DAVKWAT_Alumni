import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/utils/format';
import { MembershipPlanForm } from './MembershipPlanForm';
import { SettingsActions } from './SettingsActions';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  membership_type: string;
  duration_months: number | null;
  is_active: boolean;
}

export const metadata: Metadata = { title: 'Settings — Admin' };

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  // Check super_admin
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single();

  const isSuperAdmin = profile?.role === 'super_admin';

  // Fetch membership plans
  const { data: plans } = await supabase
    .from('membership_plans')
    .select('id, name, description, amount, membership_type, duration_months, is_active')
    .order('created_at', { ascending: true });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Manage membership plans and site configuration.</p>

      {/* Membership Plans */}
      <section className="mt-8">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-xl font-semibold">Membership Plans</h2>
        </div>

        <ul className="mt-4 space-y-3">
          {((plans ?? []) as Plan[]).map((plan) => (
            <li key={plan.id}>
              <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{plan.name}</h3>
                      <Badge variant={plan.is_active ? 'success' : 'default'}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="primary" className="capitalize">
                        {plan.membership_type}
                      </Badge>
                    </div>
                    {plan.description && (
                      <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                    )}
                    <p className="mt-1 text-lg font-semibold text-[#0F2557]">
                      {formatINR(Number(plan.amount))}
                      {plan.duration_months && (
                        <span className="text-sm font-normal text-slate-500">
                          {' '}/ {plan.duration_months} months
                        </span>
                      )}
                    </p>
                  </div>
                  <SettingsActions planId={plan.id} isActive={plan.is_active} />
                </div>
              </Card>
            </li>
          ))}
          {(plans ?? []).length === 0 && (
            <li>
              <Card className="text-center text-sm text-slate-500">
                No membership plans configured. Add one below.
              </Card>
            </li>
          )}
        </ul>

        {/* New plan form */}
        <Card className="mt-6">
          <h3 className="font-display font-semibold">Add New Plan</h3>
          <MembershipPlanForm />
        </Card>
      </section>

      {/* Admin Users — only super_admin */}
      {isSuperAdmin && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Admin Users</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage admin access. Use the Alumni detail page to promote users to admin.
          </p>
          <AdminUsersList />
        </section>
      )}
    </div>
  );
}

async function AdminUsersList() {
  const supabase = await createClient();
  const { data: admins } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('role', ['admin', 'super_admin'])
    .order('full_name');

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="pb-2 pr-3">Name</th>
            <th className="pb-2 pr-3">Email</th>
            <th className="pb-2">Role</th>
          </tr>
        </thead>
        <tbody>
          {(admins ?? []).map((a: { id: string; full_name: string; email: string; role: string }) => (
            <tr key={a.id} className="border-b border-slate-100">
              <td className="py-2.5 pr-3 font-medium">{a.full_name}</td>
              <td className="py-2.5 pr-3 text-slate-500">{a.email}</td>
              <td className="py-2.5">
                <Badge variant="primary" className="capitalize">{a.role}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
