import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string | Date, pattern = 'd MMM yyyy'): string {
  const d = typeof value === 'string' ? parseISO(value) : value;
  return format(d, pattern);
}

export function formatDateTime(value: string | Date): string {
  return formatDate(value, "d MMM yyyy, h:mm a");
}

export function formatRelative(value: string | Date): string {
  const d = typeof value === 'string' ? parseISO(value) : value;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}
