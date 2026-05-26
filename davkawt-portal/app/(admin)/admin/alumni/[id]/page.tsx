import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, GraduationCap, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/shared/Avatar';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatINR } from '@/lib/utils/format';
import { AlumniDetailActions } from './AlumniDetailActions';

export const metadata: Metadata = { title: 'Alumni Detail — Admin' };

export default async function AdminAlumniDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: alumni } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!alumni) notFound();

  // Fetch payment history
  const { data: payments } = await supabase
    .from('payments')
    .select('id, txnid, amount, status, payment_mode, created_at')
    .eq('alumni_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/admin/alumni"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0F2557]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Alumni
      </Link>

      {/* Header Card */}
      <Card className="mt-4">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar src={alumni.avatar_url} name={alumni.full_name} size="lg" />
            <div>
              <h1 className="font-display text-2xl font-semibold">{alumni.full_name}</h1>
              {alumni.display_name && (
                <p className="text-sm text-slate-500">aka {alumni.display_name}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge
                  variant={
                    alumni.approval_status === 'approved'
                      ? 'success'
                      : alumni.approval_status === 'rejected'
                        ? 'error'
                        : 'warning'
                  }
                >
                  {alumni.approval_status}
                </Badge>
                <Badge variant={alumni.is_paid_member ? 'success' : 'default'}>
                  {alumni.is_paid_member ? 'Paid Member' : 'Free'}
                </Badge>
                <Badge variant="primary">
                  {alumni.role}
                </Badge>
                {!alumni.is_active && <Badge variant="error">Deactivated</Badge>}
              </div>
            </div>
          </div>
          <AlumniDetailActions
            alumniId={alumni.id}
            currentRole={alumni.role}
            isActive={alumni.is_active}
          />
        </div>
      </Card>

      {/* Details Grid */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Contact */}
        <Card>
          <h2 className="font-display text-lg font-semibold">Contact</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <DetailRow icon={Mail} label="Email" value={alumni.email} />
            <DetailRow icon={Phone} label="Phone" value={alumni.phone ?? '—'} />
            {alumni.alternate_phone && (
              <DetailRow icon={Phone} label="Alt Phone" value={alumni.alternate_phone} />
            )}
            <DetailRow
              icon={MapPin}
              label="Location"
              value={[alumni.current_city, alumni.current_state, alumni.current_country]
                .filter(Boolean)
                .join(', ') || '—'}
            />
            {alumni.pincode && <DetailRow icon={MapPin} label="Pincode" value={alumni.pincode} />}
          </dl>
        </Card>

        {/* Academic */}
        <Card>
          <h2 className="font-display text-lg font-semibold">Academic</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <DetailRow icon={GraduationCap} label="Batch Year" value={String(alumni.batch_year)} />
            <DetailRow icon={GraduationCap} label="Course" value={alumni.course} />
            {alumni.roll_number && (
              <DetailRow icon={GraduationCap} label="Roll Number" value={alumni.roll_number} />
            )}
          </dl>
        </Card>

        {/* Professional */}
        <Card>
          <h2 className="font-display text-lg font-semibold">Professional</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <DetailRow icon={Briefcase} label="Occupation" value={alumni.occupation ?? '—'} />
            <DetailRow icon={Briefcase} label="Company" value={alumni.company ?? '—'} />
            <DetailRow icon={Briefcase} label="Job Title" value={alumni.job_title ?? '—'} />
            <DetailRow icon={Briefcase} label="Industry" value={alumni.industry ?? '—'} />
            {alumni.linkedin_url && (
              <div className="flex items-start gap-2">
                <span className="font-medium text-slate-500">LinkedIn:</span>
                <a
                  href={alumni.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0F2557] hover:underline"
                >
                  View Profile
                </a>
              </div>
            )}
          </dl>
        </Card>

        {/* Membership & Meta */}
        <Card>
          <h2 className="font-display text-lg font-semibold">Membership & Meta</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <DetailRow
              icon={Calendar}
              label="Membership Type"
              value={alumni.membership_type ?? 'None'}
            />
            {alumni.membership_expires_at && (
              <DetailRow
                icon={Calendar}
                label="Expires"
                value={formatDate(alumni.membership_expires_at)}
              />
            )}
            <DetailRow icon={Calendar} label="Registered" value={formatDate(alumni.created_at)} />
            {alumni.approved_at && (
              <DetailRow icon={Calendar} label="Approved" value={formatDate(alumni.approved_at)} />
            )}
            {alumni.last_seen_at && (
              <DetailRow icon={Calendar} label="Last Seen" value={formatDate(alumni.last_seen_at)} />
            )}
          </dl>
        </Card>
      </div>

      {/* Bio & Achievements */}
      {(alumni.bio || alumni.achievements) && (
        <Card className="mt-6">
          {alumni.bio && (
            <div>
              <h2 className="font-display text-lg font-semibold">Bio</h2>
              <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{alumni.bio}</p>
            </div>
          )}
          {alumni.achievements && (
            <div className={alumni.bio ? 'mt-6' : ''}>
              <h2 className="font-display text-lg font-semibold">Achievements</h2>
              <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{alumni.achievements}</p>
            </div>
          )}
        </Card>
      )}

      {/* Payment History */}
      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold">Payment History</h2>
        {(payments ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No payments recorded.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-3">Txn ID</th>
                  <th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Mode</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((p: { id: string; txnid: string; amount: number; status: string; payment_mode: string | null; created_at: string }) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3">
                      <code className="font-mono text-xs">{p.txnid}</code>
                    </td>
                    <td className="py-2 pr-3">{formatINR(Number(p.amount))}</td>
                    <td className="py-2 pr-3">
                      <Badge
                        variant={
                          p.status === 'success' ? 'success' : p.status === 'failed' ? 'error' : 'warning'
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 capitalize">{p.payment_mode ?? '—'}</td>
                    <td className="py-2">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Rejection reason */}
      {alumni.rejection_reason && (
        <Card className="mt-6 border-rose-200 bg-rose-50/30">
          <h2 className="font-display text-lg font-semibold text-rose-700">Rejection Reason</h2>
          <p className="mt-2 text-sm text-rose-600">{alumni.rejection_reason}</p>
        </Card>
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <dt className="font-medium text-slate-500">{label}</dt>
        <dd className="text-slate-900">{value}</dd>
      </div>
    </div>
  );
}
