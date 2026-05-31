export const LOCAL_ADMIN_COOKIE_NAME = 'davkawt_admin_session';

const LOCAL_ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

export interface LocalAdminSession {
  email: string;
  exp: number;
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function encodeText(value: string) {
  return encodeBase64Url(encoder.encode(value));
}

function decodeText(value: string) {
  return new TextDecoder().decode(decodeBase64Url(value));
}

async function signValue(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'ADMIN_SESSION_SECRET is not configured. Add it to .env.local before using local admin login.'
    );
  }

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return encodeBase64Url(new Uint8Array(signature));
}

async function secureEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);

  return (
    encodeBase64Url(new Uint8Array(leftDigest)) ===
    encodeBase64Url(new Uint8Array(rightDigest))
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isLocalAdminLoginConfigured() {
  return Boolean(
    process.env.ADMIN_LOGIN_EMAIL &&
      process.env.ADMIN_LOGIN_PASSWORD &&
      process.env.ADMIN_SESSION_SECRET
  );
}

export async function verifyLocalAdminCredentials(email: string, password: string) {
  if (!isLocalAdminLoginConfigured()) {
    return false;
  }

  const normalizedEmail = normalizeEmail(email);
  const expectedEmail = normalizeEmail(process.env.ADMIN_LOGIN_EMAIL ?? '');
  const expectedPassword = process.env.ADMIN_LOGIN_PASSWORD ?? '';

  const [emailMatches, passwordMatches] = await Promise.all([
    secureEqual(normalizedEmail, expectedEmail),
    secureEqual(password, expectedPassword),
  ]);

  return emailMatches && passwordMatches;
}

export async function createLocalAdminSessionToken(email: string) {
  const payload = encodeText(
    JSON.stringify({
      email: normalizeEmail(email),
      exp: Date.now() + LOCAL_ADMIN_SESSION_MAX_AGE * 1000,
    } satisfies LocalAdminSession)
  );
  const signature = await signValue(payload);
  return `${payload}.${signature}`;
}

export async function verifyLocalAdminSessionToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  if (!process.env.ADMIN_SESSION_SECRET) {
    return null;
  }

  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = await signValue(payload);
  if (!(await secureEqual(signature, expectedSignature))) {
    return null;
  }

  try {
    const session = JSON.parse(decodeText(payload)) as LocalAdminSession;
    if (!session.email || typeof session.exp !== 'number' || session.exp <= Date.now()) {
      return null;
    }

    return {
      email: normalizeEmail(session.email),
      exp: session.exp,
    } satisfies LocalAdminSession;
  } catch {
    return null;
  }
}

export function getLocalAdminSessionMaxAge() {
  return LOCAL_ADMIN_SESSION_MAX_AGE;
}
