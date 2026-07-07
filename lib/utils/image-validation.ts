/**
 * Shared image MIME type utilities for registration file uploads.
 *
 * Separated from server actions because exported functions from
 * 'use server' files must be async (Next.js constraint).
 */

/** Normalize file MIME type to jpeg, png, or webp based on file type or extension */
export function getCleanMimeType(file: File): string {
  const type = file.type?.toLowerCase();
  if (type === 'image/jpeg' || type === 'image/png' || type === 'image/webp') {
    return type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg'; // Default fallback (for jpg, jpeg, and unknown types)
}

/** Check if the file is a valid image type or extension */
export function isValidImage(file: File): boolean {
  const type = file.type?.toLowerCase();
  if (type === 'image/jpeg' || type === 'image/png' || type === 'image/webp') {
    return true;
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
}
