import { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdminAccess } from '@/lib/auth/admin-access';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MobileInfoRow } from '@/components/admin/MobileInfoRow';
import { CardSkeleton, Skeleton } from '@/components/shared/Skeleton';
import { ListSkeleton } from '@/components/shared/admin-section';
import { SectionError } from '@/components/shared/SectionError';
import {
  getMembershipPlansDetailed,
  getSiteSettings,
} from '@/lib/cache/admin-cache';
import { formatINR } from '@/lib/utils/format';
import { MembershipPlanForm } from './MembershipPlanForm';
import { SiteSettingsForm } from './SiteSettingsForm';
import { SettingsActions } from './SettingsActions';

export const metadata: Metadata = { title: 'Settings - Admin' };

export default async function AdminSettingsPage() {
  // Auth gate runs on every request (Req 8.2); `isSuperAdmin` decides whether the
  // Admin Users section renders. Resolution is request-scoped/memoized, so the
  // streaming regions below reuse it without re-verifying (Req 1.1/1.2).
  const adminAccess = await requireAdminAccess();
  const isSuperAdmin = adminAccess.role === 'super_admin';

  return (
    <div className="mx-auto max-w-4xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      {/* Shell: heading + description render synchronously (Req 3.1, 3.5). */}
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Manage membership plans and site configuration.</p>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Basic Site Settings</h2>
        <Card className="mt-4">
          <p className="text-sm text-slate-500">
            Update the trust identity, public contact details, and social links used across the portal.
          </p>
          {/* Site Settings region: cached Reference_Data streams in its own boundary. */}
          <Suspense fallback={<SiteSettingsFormSkeleton />}>
            <SiteSettingsRegion />
          </Suspense>
        </Card>
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-xl font-semibold">Membership Plans</h2>
        </div>

        {/* Membership Plans region: cached full-detail Reference_Data streams here. */}
        <Suspense fallback={<MembershipPlansSkeleton />}>
          <MembershipPlansRegion />
        </Suspense>

        <Card className="mt-6">
          <h3 className="font-display font-semibold">Add New Plan</h3>
          <MembershipPlanForm />
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Email and Payment Readiness</h2>
        <Card className="mt-4">
          <p className="text-sm text-slate-600">
            The portal already includes approval emails, rejection emails, event reminders, payment receipts,
            membership renewal reminders, and segmented announcement emails.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-500">
            <li><code>RESEND_API_KEY</code> and <code>RESEND_FROM_EMAIL</code> enable outbound emails.</li>
            <li><code>EASEBUZZ_KEY</code> and <code>EASEBUZZ_SALT</code> enable online payment redirects.</li>
            <li><code>CRON_SECRET</code> secures the reminder cron endpoints.</li>
          </ul>
        </Card>
      </section>

      {isSuperAdmin && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Admin Users</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage admin access. Use the Alumni detail page to promote users to admin.
          </p>
          {/* Admin Users region streams in its own boundary (Req 3.3). */}
          <Suspense fallback={<ListSkeleton rows={3} cols={3} />}>
            <AdminUsersList />
          </Suspense>
        </section>
      )}
    </div>
  );
}

/**
 * Site Settings region — serves cached `getSiteSettings()` (Reference_Data,
 * revalidate ≤ 300s; Req 4.1/4.6) and renders the preserved `SiteSettingsForm`.
 * `getSiteSettings` returns the `mapSiteSettings`-shaped value the form's
 * `initial` prop expects. A read failure renders a scoped error (Req 3.7).
 */
async function SiteSettingsRegion() {
  try {
    const siteSettings = await getSiteSettings();
    return <SiteSettingsForm initial={siteSettings} />;
  } catch {
    return <SectionError />;
  }
}

/**
 * Membership Plans region — serves cached `getMembershipPlansDetailed()`
 * (Reference_Data, revalidate ≤ 300s; Req 4.1/4.6) which carries the full plan
 * fields this page renders. A read failure renders a scoped error (Req 3.7).
 */
async function MembershipPlansRegion() {
  try {
    const plans = await getMembershipPlansDetailed();

    return (
      <ul className="mt-4 space-y-3">
        {plans.map((plan) => (
          <li key={plan.id}>
            <Card>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
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
                <div className="flex justify-end">
                  <SettingsActions planId={plan.id} isActive={plan.is_active} />
                </div>
              </div>
            </Card>
          </li>
        ))}
        {plans.length === 0 && (
          <li>
            <Card className="text-center text-sm text-slate-500">
              No membership plans configured. Add one below.
            </Card>
          </li>
        )}
      </ul>
    );
  } catch {
    return <SectionError />;
  }
}

/** Fallback approximating the `SiteSettingsForm` footprint while it streams. */
function SiteSettingsFormSkeleton() {
  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full md:col-span-2" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-10 w-40" />
    </div>
  );
}

/** Fallback matching the membership plans list (`<ul>` of cards) while it streams. */
function MembershipPlansSkeleton() {
  return (
    <ul className="mt-4 space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <li key={i}>
          <CardSkeleton className="h-24" />
        </li>
      ))}
    </ul>
  );
}

async function AdminUsersList() {
  try {
    const { database: supabase } = await requireAdminAccess();
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['admin', 'super_admin'])
      .order('full_name', { ascending: true })
      .order('id', { ascending: true });

    return (
      <>
      <div className="mt-4 grid gap-3 sm:hidden">
        {(admins ?? []).map((a: { id: string; full_name: string; email: string; role: string }) => (
          <Card key={a.id} className="p-4">
            <p className="font-medium">{a.full_name}</p>
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              <MobileInfoRow label="Email"><span className="break-all">{a.email}</span></MobileInfoRow>
              <MobileInfoRow label="Role">
                <Badge variant="primary" className="capitalize">
                  {a.role}
                </Badge>
              </MobileInfoRow>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white sm:block">
        <table className="w-full min-w-[520px] text-sm">
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
                  <Badge variant="primary" className="capitalize">
                    {a.role}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
    );
  } catch {
    return <SectionError />;
  }
}
