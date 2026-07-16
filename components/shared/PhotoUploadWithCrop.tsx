'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedFileRef = useRef<File | null>(null);

  // Load camera devices
  const loadDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');
      setCameraDevices(videoDevices);
      if (videoDevices.length > 0 && !activeDeviceId) {
        const firstDevice = videoDevices[0];
        if (firstDevice) {
          setActiveDeviceId(firstDevice.deviceId);
        }
      }
    } catch (e) {
      console.warn('[camera] error listing devices:', e);
    }
  }, [activeDeviceId]);

  // Turn on camera (requests webcam access and sets status)
  const startCamera = useCallback(async () => {
    setIsCameraActive(true);
    setPhotoPreview(null);
    setImgSrc('');
    setCameraPermissionStatus('requesting');
    
    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: activeDeviceId
          ? { deviceId: { exact: activeDeviceId }, width: { ideal: 640 }, height: { ideal: 640 } }
          : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraPermissionStatus('granted');
      
      // Allow video element to mount if not already present
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);

      // Load devices for switching after permission is granted
      loadDevices();
    } catch (err) {
      console.error('[camera] getUserMedia error:', err);
      setCameraPermissionStatus('denied');
      toast.error('Could not access camera. Please check permissions.');
    }
  }, [activeDeviceId, loadDevices]);

  // Turn off camera
  const stopCamera = useCallback(() => {
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
  };

  // React to device change when camera is already active
  useEffect(() => {
    if (isCameraActive && activeDeviceId && cameraPermissionStatus === 'granted') {
      startCamera();
    }
  }, [activeDeviceId, isCameraActive, cameraPermissionStatus, startCamera]);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
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
      if (!file) return;
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
        } catch (err) {
          console.warn('HEIC conversion failed for profile photo:', err);
        }
      }

      selectedFileRef.current = file;
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setIsDialogOpen(true);
      });
      reader.readAsDataURL(file);
    }
  };

  // Trigger modal visibility
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isDialogOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isDialogOpen]);

  // Trigger cropping modal closed
  const closeDialog = () => {
    setIsDialogOpen(false);
    // Reset file input so user can re-upload same file
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle capture from webcam
  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
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
    if (!image) return;

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
        if (!blob) {
          toast.error('Failed to compress photo');
          return;
        }

        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        
        // Expose to hidden input using DataTransfer
        if (hiddenFileInputRef.current) {
          const dt = new DataTransfer();
          dt.items.add(file);
          hiddenFileInputRef.current.files = dt.files;
          
          // Re-trigger visual change
          const previewUrl = URL.createObjectURL(file);
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
        required={required}
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload file
            </Button>
            
            {/* Camera Toggle Button */}
            <Button
              type="button"
              variant={isCameraActive ? 'destructive' : 'outline'}
              size="sm"
              className="flex items-center gap-1.5"
              onClick={isCameraActive ? stopCamera : () => {
                setIsCameraActive(true);
                setPhotoPreview(null);
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
              <Button type="button" variant="primary" size="sm" onClick={startCamera}>
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
                Camera access was denied or is blocked. Please check your browser settings or upload a file.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={startCamera}>
                Try Again
              </Button>
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
          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        </div>
      </div>

      {/* Hidden file selector */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        onChange={onFileChange}
        className="hidden"
      />

      {/* HTML5 Crop Modal Dialog */}
      <dialog
        ref={dialogRef}
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
            className="w-full sm:w-auto"
          >
            Use Original Photo
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={() => saveCroppedPhoto(true)}
            className="w-full sm:w-auto"
          >
            Apply Crop
          </Button>
        </div>
      </dialog>
    </div>
  );
}
