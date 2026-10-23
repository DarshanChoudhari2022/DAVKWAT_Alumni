import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PhotoUploadWithCrop } from './PhotoUploadWithCrop';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

describe('profile photo camera and uploads', () => {
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] };
  const getUserMedia = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([{ kind: 'videoinput', deviceId: 'front', label: 'Front camera' }]),
    } });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    HTMLDialogElement.prototype.close = function () { this.open = false; };
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  async function enableCamera() {
    fireEvent.click(screen.getByRole('button', { name: 'Take Photo' }));
    const enable = screen.queryByRole('button', { name: 'Enable Camera' });
    if (enable) fireEvent.click(enable);
  }

  it('keeps a granted camera running instead of restarting after enumeration', async () => {
    getUserMedia.mockResolvedValueOnce(stream).mockRejectedValue(new DOMException('Busy', 'NotReadableError'));
    render(<PhotoUploadWithCrop />);
    await enableCamera();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Capture Photo' })).toBeInTheDocument());
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
  });

  it('stops a late camera response when the user has cancelled', async () => {
    let resolve!: (value: typeof stream) => void;
    getUserMedia.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<PhotoUploadWithCrop />);
    await enableCamera();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Camera' }));
    await act(async () => { resolve(stream); });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Capture Photo' })).not.toBeInTheDocument();
  });

  it('explains blocked camera permission and offers the native phone camera', async () => {
    getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    render(<PhotoUploadWithCrop />);
    await enableCamera();
    expect(await screen.findByText(/Allow Camera in your browser site settings/)).toBeInTheDocument();
    expect(screen.getByLabelText('Use phone camera')).toHaveAttribute('capture', 'user');
    expect(screen.getByLabelText('Upload profile photo')).toBeInTheDocument();
  });

  it('explains when there is no webcam instead of calling it a permission denial', async () => {
    getUserMedia.mockRejectedValue(new DOMException('None', 'NotFoundError'));
    render(<PhotoUploadWithCrop />);
    await enableCamera();
    expect(await screen.findByText(/No camera was found/)).toBeInTheDocument();
  });

  it('accepts a cropped image even on browsers without a DataTransfer constructor', async () => {
    vi.stubGlobal('DataTransfer', undefined);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback) { callback(new Blob(['jpeg'], { type: 'image/jpeg' })); });
    const onChange = vi.fn();
    const { container } = render(<PhotoUploadWithCrop onChange={onChange} />);
    const picker = container.querySelector<HTMLInputElement>('input[type="file"]:not([name])')!;
    fireEvent.change(picker, { target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] } });
    const preview = await screen.findByAltText('Crop preview');
    Object.defineProperties(preview, { width: { value: 200 }, height: { value: 200 }, naturalWidth: { value: 200 }, naturalHeight: { value: 200 } });
    fireEvent.load(preview);
    fireEvent.click(screen.getByRole('button', { name: 'Apply Crop' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/jpeg' })));
    expect(screen.getByAltText('Profile photo')).toBeInTheDocument();
  });
});
