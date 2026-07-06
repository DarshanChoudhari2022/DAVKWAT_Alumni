/**
 * Client-side image compression using the Canvas API.
 *
 * Resizes large images down to a target dimension and re-encodes them as JPEG
 * at a reduced quality level. Used for school documents and payment proof
 * screenshots to keep upload sizes reasonable.
 */

/** Compress an image file client-side. Returns a new File (JPEG). */
export async function compressImage(
  file: File,
  options: {
    /** Max width or height in px (default 1200) */
    maxDimension?: number;
    /** JPEG quality 0–1 (default 0.7) */
    quality?: number;
    /** Target rough max size in bytes – will retry with lower quality if exceeded (default 500 KB) */
    targetMaxBytes?: number;
  } = {}
): Promise<File> {
  const { maxDimension = 1200, quality = 0.7, targetMaxBytes = 500 * 1024 } = options;

  // If the file is already small enough and is JPEG, skip compression
  if (file.size <= targetMaxBytes && file.type === 'image/jpeg') {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Calculate scaled dimensions keeping aspect ratio
  let newWidth = width;
  let newHeight = height;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    newWidth = Math.round(width * ratio);
    newHeight = Math.round(height * ratio);
  }

  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();

  // Try encoding at the requested quality, retry lower if still too big
  let currentQuality = quality;
  let blob: Blob;
  const MIN_QUALITY = 0.3;

  do {
    blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: currentQuality });
    if (blob.size <= targetMaxBytes || currentQuality <= MIN_QUALITY) break;
    currentQuality -= 0.1;
  } while (currentQuality >= MIN_QUALITY);

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}
