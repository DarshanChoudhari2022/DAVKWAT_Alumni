import { NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { reconcilePayment, ReconciliationError } from '@/lib/payments/reconcile';

export async function POST(request: Request) {
  const { adminAccess, error } = await requireAdminApiAccess();
  if (!adminAccess || error) return error;
  const body = await request.json().catch(() => null);
  if (typeof body?.txnid !== 'string' || !/^DAV[a-f0-9]{32}$/i.test(body.txnid)) {
    return NextResponse.json({ error: 'Invalid payment reference.' }, { status: 400 });
  }
  try {
    return NextResponse.json(await reconcilePayment(body.txnid, 'admin'));
  } catch (err) {
    return NextResponse.json({ error: err instanceof ReconciliationError ? err.message : 'Payment verification could not complete. It remains available for retry.' },
      { status: err instanceof ReconciliationError ? err.statusCode : 503 });
  }
}
