'use client';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Camera, Upload, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

// Import CSS for react-image-crop
import 'react-image-crop/dist/ReactCrop.css';

interface PhotoUploadWithCropProps {
  name?: string;
  required?: boolean;
  error?: string;
  onChange?: (file: File | null) => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function PhotoUploadWithCrop({
  name = 'profile_photo',
  required = false,
  error,
  onChange,
}: PhotoUploadWithCropProps) {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'prompt' | 'requesting' | 'granted' | 'denied'>('prompt');
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImageReady, setIsImageReady] = useState(false);
  const pickerId = useId();

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const cameraRequestRef = useRef(0);
  const photoRequestRef = useRef(0);
  const previewUrlRef = useRef<string | null>(null);

  // Load camera devices
  const loadDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');
      setCameraDevices(videoDevices);
    } catch (e) {
      console.warn('[camera] error listing devices:', e);
    }
  }, []);

  // Turn on camera (requests webcam access and sets status)
  const startCamera = useCallback(async (deviceId?: string) => {
    const requestId = ++cameraRequestRef.current;
    setIsCameraActive(true);
    setImgSrc('');
    setCameraError('');
    setCameraPermissionStatus('requesting');
    
    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera preview is unavailable in this browser. Open this page in Chrome or Safari, or use your phone camera below.');
      }
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 640 } }
          : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        // A previously selected camera can disappear after device/permission changes.
        if (deviceId && err instanceof DOMException && ['NotFoundError', 'OverconstrainedError'].includes(err.name)) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        } else throw err;
      }
      if (cameraRequestRef.current !== requestId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraPermissionStatus('granted');

      // Load devices for switching after permission is granted
      loadDevices();
    } catch (err) {
      if (cameraRequestRef.current !== requestId) return;
      const name = err instanceof DOMException ? err.name : '';
      const message = ['NotAllowedError', 'SecurityError'].includes(name)
        ? 'Camera permission is blocked. Allow Camera in your browser site settings, then try again. In WhatsApp or Instagram, open this page in Chrome or Safari.'
        : name === 'NotFoundError'
          ? 'No camera was found. Connect a camera or upload a photo.'
          : ['NotReadableError', 'AbortError'].includes(name)
            ? 'The camera is busy. Close other apps using it, then try again.'
            : err instanceof Error ? err.message : 'Could not start the camera. Upload a photo or use your phone camera below.';
      setCameraError(message);
      setCameraPermissionStatus('denied');
    }
  }, [loadDevices]);

  // Turn off camera
  const stopCamera = useCallback(() => {
    cameraRequestRef.current++;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraPermissionStatus('prompt');
  }, []);

  // Handle camera device switch
  const handleDeviceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setActiveDeviceId(newId);
    void startCamera(newId || undefined);
  };

  // Attach once React has mounted the video; never restart when status changes.
  useEffect(() => {
    if (isCameraActive && cameraPermissionStatus === 'granted' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive, cameraPermissionStatus]);

  // Cleanup camera stream
  useEffect(() => {
    const cameraRequests = cameraRequestRef;
    const photoRequests = photoRequestRef;
    return () => {
      cameraRequests.current++;
      photoRequests.current++;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle file select
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      stopCamera();
      let file = e.target.files[0];
      e.target.value = ''; // Selecting the same file again must fire change.
      if (!file) return;
      const requestId = ++photoRequestRef.current;
      setIsProcessing(false);
      setCrop(undefined);
      setCompletedCrop(null);
      setIsImageReady(false);
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File is too large. Max 10MB.');
        return;
      }

      const fileNameLower = file.name.toLowerCase();
      const isHeic =
        file.type.includes('heic') ||
        file.type.includes('heif') ||
        fileNameLower.endsWith('.heic') ||
        fileNameLower.endsWith('.heif');
      if (!isHeic && !/^image\/(jpeg|jpg|png|webp)$/i.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
        toast.error('Please choose a JPG, PNG, WebP or HEIC photo.');
        return;
      }
      setIsProcessing(true);

      if (isHeic) {
        try {
          const heic2any = (await import('heic2any')).default;
          toast.info('Converting HEIC image...');
          const conversionResult = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.8,
          });
          const blob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
          if (blob) {
            file = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: new Date().getTime(),
            });
          }
        } catch {
          if (requestId === photoRequestRef.current) {
            setIsProcessing(false);
            toast.error('This HEIC photo could not be opened. Please choose a JPG, PNG or WebP photo.');
          }
          return;
        }
      }

      if (requestId !== photoRequestRef.current) return;
      selectedFileRef.current = file;
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        if (requestId !== photoRequestRef.current) return;
        setIsProcessing(false);
        setImgSrc(reader.result?.toString() || '');
        setIsDialogOpen(true);
      });
      reader.addEventListener('error', () => {
        if (requestId !== photoRequestRef.current) return;
        setIsProcessing(false);
        toast.error('Could not read this photo. Please select it again or choose another image.');
      });
      reader.readAsDataURL(file);
    }
  };

  // Trigger modal visibility
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isDialogOpen) {
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      }
    } else {
      if (dialog.open) {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      }
    }
  }, [isDialogOpen]);

  // Trigger cropping modal closed
  const closeDialog = () => {
    photoRequestRef.current++;
    setIsDialogOpen(false);
    setImgSrc('');
    setIsImageReady(false);
    // Reset file input so user can re-upload same file
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle capture from webcam
  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) {
        toast.error('The camera is still starting. Please wait a moment and try again.');
        return;
      }
      setCrop(undefined);
      setCompletedCrop(null);
      setIsImageReady(false);
      const canvas = document.createElement('canvas');
      
      // We want a square capture
      const size = Math.min(video.videoWidth, video.videoHeight);
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw centered square from video stream
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setImgSrc(dataUrl);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            selectedFileRef.current = file;
          }
        }, 'image/jpeg', 0.95);

        stopCamera();
        setIsDialogOpen(true);
      }
    }
  };

  // Initial crop settings when image loads
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    if (width === 0 || height === 0) return;
    setIsImageReady(true);
    const initialCrop = centerAspectCrop(width, height, 1);
    setCrop(initialCrop);
    
    // Set default completedCrop (PixelCrop) so clicking Apply Crop immediately works
    const pixelCrop: PixelCrop = {
      unit: 'px',
      x: (initialCrop.x * width) / 100,
      y: (initialCrop.y * height) / 100,
      width: (initialCrop.width * width) / 100,
      height: (initialCrop.height * height) / 100,
    };
    setCompletedCrop(pixelCrop);
  };

  // Save the cropped & compressed file to input
  const saveCroppedPhoto = async (useCrop: boolean) => {
    const image = imgRef.current;
    if (!image || !image.naturalWidth || !image.width) return;
    const requestId = photoRequestRef.current;

    let activeCrop = completedCrop;
    if (useCrop && (!activeCrop || activeCrop.width === 0 || activeCrop.height === 0)) {
      // Fallback: Generate a default center crop dynamically if completedCrop is somehow not set
      const minDim = Math.min(image.width, image.height);
      activeCrop = {
        unit: 'px',
        x: (image.width - minDim) / 2,
        y: (image.height - minDim) / 2,
        width: minDim,
        height: minDim,
      };
    }

    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    let sWidth = image.naturalWidth;
    let sHeight = image.naturalHeight;
    let sx = 0;
    let sy = 0;

    if (useCrop && activeCrop) {
      sWidth = activeCrop.width * scaleX;
      sHeight = activeCrop.height * scaleY;
      sx = activeCrop.x * scaleX;
      sy = activeCrop.y * scaleY;
    } else {
      // Use original photo dimensions (no cropping)
      sWidth = image.naturalWidth;
      sHeight = image.naturalHeight;
      sx = 0;
      sy = 0;
    }

    // Output dimension (keep aspect ratio, max 500px width/height)
    let outWidth = sWidth;
    let outHeight = sHeight;
    const maxDim = 500;
    
    if (sWidth > maxDim || sHeight > maxDim) {
      if (sWidth > sHeight) {
        outWidth = maxDim;
        outHeight = Math.round((sHeight * maxDim) / sWidth);
      } else {
        outHeight = maxDim;
        outWidth = Math.round((sWidth * maxDim) / sHeight);
      }
    }
    
    canvas.width = outWidth;
    canvas.height = outHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error('Failed to process photo');
      return;
    }

    // Draw the image
    ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, outWidth, outHeight);

    // Export as compressed JPEG blob
    canvas.toBlob(
      (blob) => {
        if (requestId !== photoRequestRef.current) return;
        if (!blob) {
          toast.error('Failed to compress photo');
          return;
        }

        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        
        // Populate native form input where supported. Parent form also keeps
        // the File directly, for mobile browsers without writable FileLists.
        if (hiddenFileInputRef.current) {
          try {
            const dt = new DataTransfer();
            dt.items.add(file);
            hiddenFileInputRef.current.files = dt.files;
          } catch {
            // The selected File is passed to the registration action by onChange.
          }
          
          // Re-trigger visual change
          const previewUrl = URL.createObjectURL(file);
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = previewUrl;
          selectedFileRef.current = file; // Keep reference to prevent GC of the file and its object URL
          setPhotoPreview(previewUrl);
          setIsDialogOpen(false);
          if (useCrop) {
            toast.success('Photo cropped and compressed successfully!');
          } else {
            toast.success('Original photo compressed and uploaded successfully!');
          }
          onChange?.(file);
        }
      },
      'image/jpeg',
      0.80 // 80% JPEG compression (excellent size/quality ratio)
    );
  };

  const removePhoto = () => {
    photoRequestRef.current++;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPhotoPreview(null);
    setImgSrc('');
    selectedFileRef.current = null;
    setCrop(undefined);
    setCompletedCrop(null);
    stopCamera();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (hiddenFileInputRef.current) {
      hiddenFileInputRef.current.value = '';
    }
    onChange?.(null);
  };

  return (
    <div className="space-y-4">
      {/* Hidden input that Next.js Form Action will read */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        id={name}
        name={name}
        aria-required={required}
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Profile photo preview/camera box */}
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50 shadow-inner">
          {isCameraActive ? (
            cameraPermissionStatus === 'granted' ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover scale-x-[-1]"
              />
            ) : cameraPermissionStatus === 'requesting' ? (
              <div className="flex flex-col items-center gap-1 text-blue-500 animate-pulse">
                <Camera className="h-7 w-7" />
                <span className="text-[9px] font-bold text-center">Allowing...</span>
              </div>
            ) : cameraPermissionStatus === 'denied' ? (
              <div className="flex flex-col items-center gap-1 text-rose-500">
                <X className="h-7 w-7" />
                <span className="text-[9px] font-bold text-center">No Access</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-400">
                <Camera className="h-7 w-7" />
                <span className="text-[9px] font-bold text-center">Ready</span>
              </div>
            )
          ) : photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="Profile photo" className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-400">
              <Camera className="h-7 w-7" />
              <span className="text-[10px] font-medium">No Image</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-wrap gap-2">
            {/* Upload Button */}
            <label
              htmlFor={pickerId}
              className="relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium hover:bg-slate-50 focus-within:ring-2 focus-within:ring-[#0F2557]"
            >
              <Upload className="h-4 w-4" />
              Upload file
              <input
                ref={fileInputRef}
                id={pickerId}
                aria-label="Upload profile photo"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                onChange={onFileChange}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            
            {/* Camera Toggle Button */}
            <Button
              type="button"
              variant={isCameraActive ? 'destructive' : 'outline'}
              size="sm"
              className="flex items-center gap-1.5"
              onClick={isCameraActive ? stopCamera : () => {
                setIsCameraActive(true);
                setImgSrc('');
                setCameraPermissionStatus('prompt');
              }}
            >
              <Camera className="h-4 w-4" />
              {isCameraActive ? 'Cancel Camera' : 'Take Photo'}
            </Button>

            {/* Remove Button */}
            {(photoPreview || isCameraActive) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={removePhoto}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            )}
          </div>

          {/* Camera Permission State Box */}
          {isCameraActive && cameraPermissionStatus === 'prompt' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="text-slate-600 mb-2">
                Click below to request camera permission, then choose &quot;Allow&quot; when prompted by your browser.
              </p>
              <Button type="button" variant="primary" size="sm" onClick={() => startCamera()}>
                Enable Camera
              </Button>
            </div>
          )}

          {isCameraActive && cameraPermissionStatus === 'requesting' && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs">
              <p className="text-blue-700 animate-pulse font-medium">
                Awaiting camera access... Please click &quot;Allow&quot; on the browser prompt.
              </p>
            </div>
          )}

          {isCameraActive && cameraPermissionStatus === 'denied' && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs">
              <p className="text-rose-700 mb-2 font-medium">
                {cameraError}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => startCamera()}>
                Try Again
              </Button>
              <label className="relative mt-2 inline-flex cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">
                Use phone camera
                <input ref={nativeCameraInputRef} aria-label="Use phone camera" type="file" accept="image/*" capture="user" onChange={onFileChange} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              </label>
            </div>
          )}

          {/* Device selection dropdown for multi-camera systems */}
          {isCameraActive && cameraPermissionStatus === 'granted' && cameraDevices.length > 1 && (
            <div className="max-w-[200px]">
              <select
                id="camera-select"
                className="w-full text-xs rounded-md border border-slate-200 bg-white p-1 text-slate-600 focus:outline-none"
                value={activeDeviceId}
                onChange={handleDeviceChange}
              >
                <option value="">Default camera</option>
                {cameraDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${cameraDevices.indexOf(device) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Capture controls */}
          {isCameraActive && cameraPermissionStatus === 'granted' && (
            <div className="mt-1">
              <Button
                type="button"
                variant="accent"
                size="sm"
                onClick={capturePhoto}
                className="w-full sm:w-auto"
              >
                Capture Photo
              </Button>
            </div>
          )}

          <p className="text-xs text-slate-500">
            JPG, PNG or WebP. Pre-compressed automatically to speed up your upload.
          </p>
          {isProcessing && <p role="status" className="text-xs text-blue-700">Opening photo…</p>}
          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        </div>
      </div>

      {/* HTML5 Crop Modal Dialog */}
      <dialog
        ref={dialogRef}
        onCancel={(event) => { event.preventDefault(); closeDialog(); }}
        aria-label="Crop profile photo"
        className="fixed inset-0 z-50 m-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-display text-lg font-bold text-slate-800">Crop Profile Photo</h2>
          <button
            type="button"
            onClick={closeDialog}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50">
          {imgSrc && (
            <div className="max-h-[350px] overflow-auto border border-slate-200 rounded-xl bg-white p-2">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                className="max-w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={imgSrc}
                  onLoad={onImageLoad}
                  onError={() => { closeDialog(); toast.error('This image could not be opened. Please choose a JPG, PNG or WebP photo.'); }}
                  className="max-h-[320px] w-auto object-contain"
                />
              </ReactCrop>
            </div>
          )}
          <p className="mt-4 text-xs text-center text-slate-500">
            Drag the circular overlay to select your face. Only the area inside the circle will be saved.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={closeDialog}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => saveCroppedPhoto(false)}
            disabled={!isImageReady}
            className="w-full sm:w-auto"
          >
            Use Original Photo
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={() => saveCroppedPhoto(true)}
            disabled={!isImageReady}
            className="w-full sm:w-auto"
          >
            Apply Crop
          </Button>
        </div>
      </dialog>
    </div>
  );
}
