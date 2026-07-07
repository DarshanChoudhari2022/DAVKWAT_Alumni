import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { compressImage } from './image-compress';

describe('compressImage', () => {
  let originalCreateObjectURL: any;
  let originalRevokeObjectURL: any;

  beforeEach(() => {
    // Save original URL methods
    originalCreateObjectURL = window.URL.createObjectURL;
    originalRevokeObjectURL = window.URL.revokeObjectURL;

    // Mock URL methods
    window.URL.createObjectURL = vi.fn().mockReturnValue('mock-object-url');
    window.URL.revokeObjectURL = vi.fn();

    // Mock OffscreenCanvas if it exists, or ensure it doesn't interfere
    if ('OffscreenCanvas' in window) {
      delete (window as any).OffscreenCanvas;
    }
    if ('createImageBitmap' in window) {
      delete (window as any).createImageBitmap;
    }

    // Mock document.createElement for 'canvas' and 'img'
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue({
            drawImage: vi.fn(),
          }),
          toBlob: vi.fn().mockImplementation((callback) => {
            callback(new Blob(['compressed-data'], { type: 'image/jpeg' }));
          }),
        } as any;
      }
      if (tagName === 'img') {
        const img = {
          src: '',
          width: 800,
          height: 600,
          onload: null as any,
          onerror: null as any,
        };
        // Trigger onload asynchronously when src is set
        Object.defineProperty(img, 'src', {
          set(val) {
            this._src = val;
            setTimeout(() => {
              if (this.onload) this.onload();
            }, 0);
          },
          get() {
            return this._src;
          },
        });
        return img as any;
      }
      return originalCreateElement(tagName);
    });
  });

  const originalCreateElement = document.createElement.bind(document);

  afterEach(() => {
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('skips compression if the file is already under the target size and is JPEG', async () => {
    const file = new File(['small-jpeg-data'], 'test.jpg', { type: 'image/jpeg' });
    // file size = 15 bytes, targetMaxBytes = 500 KB (512000 bytes)
    const result = await compressImage(file, { targetMaxBytes: 500 * 1024 });
    expect(result).toBe(file);
  });

  it('compress files using the HTMLCanvas fallback when modern APIs are missing', async () => {
    const file = new File(['large-png-data'], 'test.png', { type: 'image/png' });
    const result = await compressImage(file, {
      maxDimension: 400,
      targetMaxBytes: 50,
    });

    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('test.jpg');
    expect(result.type).toBe('image/jpeg');
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('mock-object-url');
  });
});
