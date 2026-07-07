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

  // 1. Try modern OffscreenCanvas + createImageBitmap first if available
  if (
    typeof window !== 'undefined' &&
    typeof window.createImageBitmap === 'function' &&
    typeof window.OffscreenCanvas === 'function'
  ) {
    try {
      const bitmap = await createImageBitmap(file);
      const { width, height } = bitmap;

      let newWidth = width;
      let newHeight = height;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        newWidth = Math.round(width * ratio);
        newHeight = Math.round(height * ratio);
      }

      const canvas = new OffscreenCanvas(newWidth, newHeight);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
        bitmap.close();

        let currentQuality = quality;
        let blob: Blob | null = null;
        const MIN_QUALITY = 0.3;

        do {
          blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: currentQuality });
          if (blob.size <= targetMaxBytes || currentQuality <= MIN_QUALITY) break;
          currentQuality -= 0.1;
        } while (currentQuality >= MIN_QUALITY);

        if (blob) {
          const baseName = file.name.replace(/\.[^.]+$/, '');
          return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
        }
      }
    } catch (err) {
      console.warn('Modern OffscreenCanvas compression failed, falling back to legacy canvas...', err);
    }
  }

  // 2. Fallback: standard HTMLImageElement + HTMLCanvasElement
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Image compression requires a browser environment');
  }

  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        const { width, height } = img;
        let newWidth = width;
        let newHeight = height;
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          newWidth = Math.round(width * ratio);
          newHeight = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get 2D canvas context');
        }

        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        URL.revokeObjectURL(objectUrl);

        let currentQuality = quality;
        let blob: Blob | null = null;
        const MIN_QUALITY = 0.3;

        const getBlob = (q: number): Promise<Blob | null> => {
          return new Promise((res) => {
            canvas.toBlob((b) => res(b), 'image/jpeg', q);
          });
        };

        do {
          blob = await getBlob(currentQuality);
          if (!blob) break;
          if (blob.size <= targetMaxBytes || currentQuality <= MIN_QUALITY) break;
          currentQuality -= 0.1;
        } while (currentQuality >= MIN_QUALITY);

        if (!blob) {
          throw new Error('Canvas toBlob returned null');
        }

        const baseName = file.name.replace(/\.[^.]+$/, '');
        resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file into Image object'));
    };

    img.src = objectUrl;
  });
}
