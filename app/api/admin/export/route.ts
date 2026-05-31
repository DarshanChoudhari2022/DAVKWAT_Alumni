import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { arrayToCSV, arrayToXLSX } from '@/lib/utils/export';

const ALUMNI_COLUMNS = [
  { key: 'full_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'batch_year', label: 'Batch Year' },
  { key: 'course', label: 'Course' },
  { key: 'current_city', label: 'City' },
  { key: 'current_state', label: 'State' },
  { key: 'current_country', label: 'Country' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'company', label: 'Company' },
  { key: 'role', label: 'Role' },
  { key: 'approval_status', label: 'Status' },
  { key: 'is_paid_member', label: 'Paid Member' },
  { key: 'membership_type', label: 'Membership Type' },
  { key: 'created_at', label: 'Registered At' },
];

const PAYMENT_COLUMNS = [
  { key: 'txnid', label: 'Transaction ID' },
  { key: 'alumni_name', label: 'Alumni Name' },
  { key: 'alumni_email', label: 'Alumni Email' },
  { key: 'amount', label: 'Amount (INR)' },
  { key: 'status', label: 'Status' },
  { key: 'payment_mode', label: 'Payment Mode' },
  { key: 'bank_ref_num', label: 'Bank Ref' },
  { key: 'created_at', label: 'Date' },
];

const RSVP_COLUMNS = [
  { key: 'full_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'batch_year', label: 'Batch Year' },
  { key: 'registered_at', label: 'RSVP Date' },
];

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify admin
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!adminProfile || !['admin', 'super_admin'].includes(adminProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const format = searchParams.get('format') ?? 'csv';

  let data: Record<string, unknown>[] = [];
  let columns: { key: string; label: string }[] = [];
  let filename = 'export';

  if (type === 'alumni') {
    columns = ALUMNI_COLUMNS;
    filename = 'alumni-export';

    let query = supabase
      .from('profiles')
      .select(
        'full_name, email, phone, batch_year, course, current_city, current_state, current_country, occupation, company, role, approval_status, is_paid_member, membership_type, created_at'
      );

    const status = searchParams.get('status');
    const membership = searchParams.get('membership');
    const q = searchParams.get('q');
    if (status) query = query.eq('approval_status', status as 'pending' | 'approved' | 'rejected');
    if (membership === 'paid') query = query.eq('is_paid_member', true);
    if (membership === 'free') query = query.eq('is_paid_member', false);
    if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);

    const { data: rows } = await query.order('created_at', { ascending: false });
    data = (rows ?? []) as unknown as Record<string, unknown>[];

  } else if (type === 'payments') {
    columns = PAYMENT_COLUMNS;
    filename = 'payments-export';

    let query = supabase
      .from('payments')
      .select('txnid, amount, status, payment_mode, bank_ref_num, created_at, profiles!inner(full_name, email)');

    const status = searchParams.get('status');
    if (status) query = query.eq('status', status as 'pending' | 'success' | 'failed' | 'refunded');

    const { data: rows } = await query.order('created_at', { ascending: false });
    data = (rows ?? []).map((r: Record<string, unknown>) => {
      const profile = r.profiles as { full_name: string; email: string } | null;
      return {
        ...r,
        alumni_name: profile?.full_name ?? '',
        alumni_email: profile?.email ?? '',
      };
    });
    const q = searchParams.get('q')?.trim().toLowerCase();
    if (q) {
      data = data.filter((row) => {
        const txnid = String(row.txnid ?? '').toLowerCase();
        const alumniName = String(row.alumni_name ?? '').toLowerCase();
        const alumniEmail = String(row.alumni_email ?? '').toLowerCase();
        return (
          txnid.includes(q) || alumniName.includes(q) || alumniEmail.includes(q)
        );
      });
    }

  } else if (type === 'rsvps' || type === 'event_rsvps') {
    columns = RSVP_COLUMNS;
    filename = 'event-rsvps-export';
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'eventId required for RSVP export' }, { status: 400 });
    }

    const { data: rows } = await supabase
      .from('event_rsvps')
      .select('registered_at, profiles!inner(full_name, email, phone, batch_year)')
      .eq('event_id', eventId);

    data = (rows ?? []).map((r: Record<string, unknown>) => {
      const profile = r.profiles as { full_name: string; email: string; phone: string; batch_year: number } | null;
      return {
        full_name: profile?.full_name ?? '',
        email: profile?.email ?? '',
        phone: profile?.phone ?? '',
        batch_year: profile?.batch_year ?? '',
        registered_at: r.registered_at,
      };
    });

  } else {
    return NextResponse.json({ error: 'Invalid export type. Use: alumni, payments, rsvps' }, { status: 400 });
  }

  if (format === 'xlsx') {
    const buffer = arrayToXLSX(data, columns);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  // Default: CSV
  const csv = arrayToCSV(data, columns);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  });
}
