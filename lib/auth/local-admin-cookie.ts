import { cookies } from 'next/headers';
import {
  LOCAL_ADMIN_COOKIE_NAME,
  createLocalAdminSessionToken,
  getLocalAdminSessionMaxAge,
  verifyLocalAdminSessionToken,
} from './local-admin';

export async function getLocalAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(LOCAL_ADMIN_COOKIE_NAME)?.value;
  return verifyLocalAdminSessionToken(token);
}

export async function startLocalAdminSession(email: string) {
  const cookieStore = await cookies();
  const token = await createLocalAdminSessionToken(email);

  cookieStore.set(LOCAL_ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: getLocalAdminSessionMaxAge(),
  });
}

export async function clearLocalAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(LOCAL_ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
}
