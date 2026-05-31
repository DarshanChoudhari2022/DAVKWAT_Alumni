import { NextResponse } from 'next/server';
import { getAdminAccess, getAdminActorProfileErrorMessage } from './admin-access';

export async function requireAdminApiAccess() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess) {
    return {
      adminAccess: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { adminAccess, error: null };
}

export function getAdminActorProfileErrorResponse() {
  return NextResponse.json({ error: getAdminActorProfileErrorMessage() }, { status: 500 });
}
