import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { arrayToCSV, arrayToXLSX } from '@/lib/utils/export';
import { escapeIlikePattern, normalizeSearchTerm } from '@/lib/utils/search';

const ALUMNI_COLUMNS = [
  { key: 'full_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'batch_year', label: 'Batch Year' },
  { key: 'city', label: 'City' },
  { key: 'attendee_type', label: 'Type' },
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
  const { adminAccess, error } = await requireAdminApiAccess();
  if (error || !adminAccess) return error;

  const supabase = adminAccess.database;

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
    const batch = searchParams.get('batch');
    const city = searchParams.get('city');
    const q = normalizeSearchTerm(searchParams.get('q'));
    if (status) query = query.eq('approval_status', status as 'pending' | 'approved' | 'rejected');
    if (membership === 'paid') query = query.eq('is_paid_member', true);
    if (membership === 'free') query = query.eq('is_paid_member', false);
    if (batch) query = query.eq('batch_year', Number(batch));
    if (city) query = query.ilike('current_city', `%${escapeIlikePattern(city)}%`);
    if (q) {
      const term = `%${escapeIlikePattern(q)}%`;
      query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
    }

    const { data: rows } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
    data = (rows ?? []) as unknown as Record<string, unknown>[];

  } else if (type === 'payments') {
    columns = PAYMENT_COLUMNS;
    filename = 'payments-export';

    let query = supabase
      .from('payments')
      .select('txnid, amount, status, payment_mode, bank_ref_num, created_at, profiles!inner(full_name, email)');

    const status = searchParams.get('status');
    if (status) query = query.eq('status', status as 'pending' | 'success' | 'failed' | 'refunded');

    const { data: rows } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
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
      .select('registered_at, guest_name, guest_email, guest_phone, guest_batch_year, guest_city, profiles(full_name, email, phone, batch_year, current_city)')
      .eq('event_id', eventId);

    data = (rows ?? []).map((r: Record<string, unknown>) => {
      const profile = r.profiles as { full_name: string; email: string; phone: string; batch_year: number } | null;
      return {
        full_name: profile?.full_name ?? r.guest_name ?? '',
        email: profile?.email ?? r.guest_email ?? '',
        phone: profile?.phone ?? r.guest_phone ?? '',
        batch_year: profile?.batch_year ?? r.guest_batch_year ?? '',
        city: (profile as { current_city?: string | null } | null)?.current_city ?? r.guest_city ?? '',
        attendee_type: profile ? 'Member' : 'Guest',
        registered_at: r.registered_at,
      };
    });

  } else {
    return NextResponse.json({ error: 'Invalid export type. Use: alumni, payments, rsvps' }, { status: 400 });
  }

  if (format === 'xlsx') {
    const buffer = await arrayToXLSX(data, columns);
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
