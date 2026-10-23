import { NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { adminAccess, error } = await requireAdminApiAccess();
  if (!adminAccess || error) return error;
  const result = await adminAccess.database.from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('approval_status', 'pending').in('profile_type', ['alumni', 'faculty']);
  if (result.error || result.count === null) {
    return NextResponse.json({ error: 'Pending count unavailable.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
  return NextResponse.json({ count: result.count }, { headers: { 'Cache-Control': 'private, no-store' } });
}
