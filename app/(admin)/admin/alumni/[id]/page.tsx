import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, GraduationCap, Calendar, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/shared/Avatar';
import { requireAdminAccess } from '@/lib/auth/admin-access';
import { formatDate } from '@/lib/utils/format';
import { AlumniDetailActions } from './AlumniDetailActions';
import { AdminProfileEditForm } from './AdminProfileEditForm';

export const metadata: Metadata = { title: 'Alumni Detail — Admin' };

export default async function AdminAlumniDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const adminAccess = await requireAdminAccess();
  const { database: supabase } = adminAccess;

  // Parallel fetch: profile + payments at the same time (~2x faster)
  const [alumniResult, paymentsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('payments')
      .select('id, txnid, amount, status, payment_mode, receipt_url, created_at')
      .eq('alumni_id', id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(10),
  ]);

  const alumni = alumniResult.data;
  if (!alumni) notFound();
  const payments = paymentsResult.data;
  const latestPaymentProofUrl = payments?.find((payment) => payment.receipt_url)?.receipt_url ?? null;

  return (
    <div className="mx-auto max-w-4xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <Link
        href="/admin/alumni"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0F2557]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Alumni
      </Link>

      {/* Header Card */}
      <Card className="mt-4 p-4 sm:p-5">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar src={alumni.avatar_url} name={alumni.full_name} size="lg" />
            <div className="min-w-0">
              <h1 className="break-words font-display text-2xl font-semibold">{alumni.full_name}</h1>
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
                  {alumni.is_paid_member ? 'Paid Member' : 'Unpaid'}
                </Badge>
                <Badge variant="default">
                  {alumni.profile_type === 'faculty' ? 'Faculty' : 'Alumni'}
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
            canDelete={adminAccess.role === 'super_admin'}
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

        {/* Academic / Faculty */}
        <Card>
          <h2 className="font-display text-lg font-semibold">
            {alumni.profile_type === 'faculty' ? 'Faculty Details' : 'Academic'}
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            {alumni.profile_type === 'faculty' ? (
              <>
                <DetailRow icon={GraduationCap} label="Subject Taught" value={alumni.taught_subject ?? '-'} />
                <DetailRow icon={GraduationCap} label="Taught From" value={alumni.taught_from_year ? String(alumni.taught_from_year) : '-'} />
                <DetailRow icon={GraduationCap} label="Taught Till" value={alumni.taught_to_year ? String(alumni.taught_to_year) : 'Present / not specified'} />
              </>
            ) : (
              <>
                <DetailRow icon={GraduationCap} label="Course" value={alumni.course} />
                {alumni.education_level && (
                  <DetailRow
                    icon={GraduationCap}
                    label="School Level"
                    value={
                      alumni.education_level === 'left_before_10th'
                        ? 'Left before completing schooling'
                        : alumni.education_level === 'secondary'
                        ? 'Secondary (10th)'
                        : alumni.education_level === 'senior_secondary'
                        ? 'Higher Secondary (12th)'
                        : alumni.education_level === 'other'
                        ? 'Other'
                        : (alumni.education_level as string).replaceAll('_', ' ')
                    }
                  />
                )}
                {alumni.education_stream && (
                  <DetailRow icon={GraduationCap} label="Stream" value={alumni.education_stream} />
                )}
                {alumni.education_level === 'senior_secondary' ? (
                  <>
                    <DetailRow icon={GraduationCap} label="Secondary (10th) Passing Year" value={alumni.passing_year_10th ? String(alumni.passing_year_10th) : '—'} />
                    <DetailRow icon={GraduationCap} label="Higher Secondary (12th) Passing Year" value={String(alumni.batch_year)} />
                  </>
                ) : (
                  <DetailRow icon={GraduationCap} label="Passing/Leaving Year" value={String(alumni.batch_year)} />
                )}
                {alumni.roll_number && (
                  <DetailRow icon={GraduationCap} label="Roll Number" value={alumni.roll_number} />
                )}
              </>
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
              <MaskedViewLink label="LinkedIn" href={alumni.linkedin_url} />
            )}
          </dl>
        </Card>

        {/* Verification documents */}
        <Card>
          <h2 className="font-display text-lg font-semibold">Verification Documents</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <MaskedViewLink label="Proof of Schooling" href={alumni.school_document_url} />
            <MaskedViewLink label="Proof of Payment" href={latestPaymentProofUrl} />
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

      {/* Rejection reason */}
      {alumni.rejection_reason && (
        <Card className="mt-6 border-rose-200 bg-rose-50/30">
          <h2 className="font-display text-lg font-semibold text-rose-700">Rejection Reason</h2>
          <p className="mt-2 text-sm text-rose-600">{alumni.rejection_reason}</p>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="font-display text-lg font-semibold">Edit Selected Fields</h2>
        <p className="mt-1 text-sm text-slate-500">
          Update contact, professional, privacy, and profile information for this alumni record.
        </p>
        <div className="mt-4">
          <AdminProfileEditForm
            alumniId={alumni.id}
            initial={{
              full_name: alumni.full_name,
              email: alumni.email,
              display_name: alumni.display_name,
              phone: alumni.phone,
              alternate_phone: alumni.alternate_phone,
              current_city: alumni.current_city,
              current_state: alumni.current_state,
              current_country: alumni.current_country,
              occupation: alumni.occupation,
              company: alumni.company,
              job_title: alumni.job_title,
              industry: alumni.industry,
              linkedin_url: alumni.linkedin_url,
              website_url: alumni.website_url,
              bio: alumni.bio,
              achievements: alumni.achievements,
              hide_email: alumni.hide_email,
              hide_phone: alumni.hide_phone,
            }}
          />
        </div>
      </Card>
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

function maskExternalUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return 'External file';
  }
}

function MaskedViewLink({ label, href }: { label: string; href: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="text-right">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-[#0F2557] hover:bg-slate-50"
            title={maskExternalUrl(href)}
          >
            View
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="text-slate-400">Not uploaded</span>
        )}
      </dd>
    </div>
  );
}
