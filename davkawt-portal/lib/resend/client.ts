import { Resend } from 'resend';

let _client: Resend | null = null;

export function getResend(): Resend {
  if (!_client) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set');
    }
    _client = new Resend(process.env.RESEND_API_KEY);
  }
  return _client;
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@davkawt.org';
export const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? 'admin@davkawt.org';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
