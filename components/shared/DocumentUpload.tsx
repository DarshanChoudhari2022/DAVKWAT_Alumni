'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, FileImage, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/utils/image-compress';

interface DocumentUploadProps {
  /** Form field name */
  name: string;
  /** Label shown above the drop zone */
  label: string;
  /** Whether the field is required */
  required?: boolean;
  /** Validation error message */
  error?: string;
  /** Max file size before compression in bytes (default 10 MB) */
  maxRawSize?: number;
  /** Target max compressed size in bytes (default 500 KB) */
  targetCompressedSize?: number;
  /** Max dimension for compression (default 1400) */
  maxDimension?: number;
  /** Accept attribute for the file input */
  accept?: string;
  /** Callback fired when a file is selected or removed */
  onChange?: (file: File | null) => void;
}

export function DocumentUpload({
  name,
  label,
  required = false,
  error,
  maxRawSize = 10 * 1024 * 1024,
  targetCompressedSize = 500 * 1024,
  maxDimension = 1400,
  accept = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif',
  onChange,
}: DocumentUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      const fileNameLower = file.name.toLowerCase();
      const isHeic =
        file.type.includes('heic') ||
        file.type.includes('heif') ||
        fileNameLower.endsWith('.heic') ||
        fileNameLower.endsWith('.heif');
      const isAllowedImage =
        file.type.startsWith('image/') ||
        isHeic ||
        fileNameLower.endsWith('.jpg') ||
        fileNameLower.endsWith('.jpeg') ||
        fileNameLower.endsWith('.png') ||
        fileNameLower.endsWith('.webp');

      if (!isAllowedImage) {
        toast.error('Please upload an image file (JPG, PNG, or WebP)');
        return;
      }
      if (file.size > maxRawSize) {
        toast.error(`File is too large. Maximum size is ${Math.round(maxRawSize / 1024 / 1024)} MB`);
        return;
      }

      setIsCompressing(true);
      try {
        const compressed = await compressImage(file, {
          maxDimension,
          quality: 0.7,
          targetMaxBytes: targetCompressedSize,
        });

        // Set preview
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(compressed);

        setFileName(compressed.name);

        // Put the compressed file into the hidden file input via DataTransfer
        const dt = new DataTransfer();
        dt.items.add(compressed);
        if (hiddenInputRef.current) {
          hiddenInputRef.current.files = dt.files;
        }
        onChange?.(compressed);

        const savedKB = Math.round((file.size - compressed.size) / 1024);
        if (savedKB > 10) {
          toast.success(`Compressed: saved ${savedKB} KB`);
        }
      } catch (err) {
        console.error('Compression failed, attempting fallback:', err);
        
        const fileNameLower = file.name.toLowerCase();
        const isHeic =
          file.type.includes('heic') ||
          file.type.includes('heif') ||
          fileNameLower.endsWith('.heic') ||
          fileNameLower.endsWith('.heif');

        // Check if the file is a valid web image (JPG, PNG, WebP) by mime type or extension
        const isAllowedWebImage =
          file.type.startsWith('image/') ||
          fileNameLower.endsWith('.jpg') ||
          fileNameLower.endsWith('.jpeg') ||
          fileNameLower.endsWith('.png') ||
          fileNameLower.endsWith('.webp');

        if (isAllowedWebImage && !isHeic) {
          // Normalize the mime type for standard web image uploads (e.g. converting image/jpg or empty mime to image/jpeg)
          let cleanMimeType = 'image/jpeg';
          const fileExt = file.name.split('.').pop()?.toLowerCase();
          if (fileExt === 'png') {
            cleanMimeType = 'image/png';
          } else if (fileExt === 'webp') {
            cleanMimeType = 'image/webp';
          } else if (file.type.toLowerCase() === 'image/png') {
            cleanMimeType = 'image/png';
          } else if (file.type.toLowerCase() === 'image/webp') {
            cleanMimeType = 'image/webp';
          }

          const fallbackFile = file.type === cleanMimeType 
            ? file 
            : new File([file], file.name, {
                type: cleanMimeType,
                lastModified: file.lastModified,
              });

          // Fallback: Set preview with original file
          const reader = new FileReader();
          reader.onload = () => setPreview(reader.result as string);
          reader.readAsDataURL(fallbackFile);

          setFileName(fallbackFile.name);

          // Put the normalized fallback file into the hidden file input via DataTransfer
          const dt = new DataTransfer();
          dt.items.add(fallbackFile);
          if (hiddenInputRef.current) {
            hiddenInputRef.current.files = dt.files;
          }
          onChange?.(fallbackFile);
          toast.success('Uploaded original image without compression');
        } else if (isHeic) {
          toast.error(
            'HEIC/HEIF images could not be converted on this browser. Please upload a JPG, PNG, or WebP image.'
          );
        } else {
          toast.error('Failed to process image. Please try another file.');
        }
      } finally {
        setIsCompressing(false);
      }
    },
    [maxRawSize, targetCompressedSize, maxDimension, onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleRemove = () => {
    setPreview(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (hiddenInputRef.current) {
      const dt = new DataTransfer();
      hiddenInputRef.current.files = dt.files;
    }
    onChange?.(null);
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>

      {/* Hidden file input that holds the compressed file for form submission */}
      <input ref={hiddenInputRef} type="file" name={name} className="sr-only" tabIndex={-1} />

      {preview ? (
        /* Preview state */
        <div className="relative rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-start gap-3">
            <Image
              src={preview}
              alt="Upload preview"
              width={80}
              height={80}
              unoptimized
              className="h-20 w-20 rounded-lg border border-slate-100 object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{fileName}</p>
              <p className="mt-0.5 text-xs text-emerald-600">✓ Compressed & ready</p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-rose-500"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 transition ${
            isDragOver
              ? 'border-[#0F2557] bg-blue-50/50'
              : error
                ? 'border-rose-300 bg-rose-50/30'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          {isCompressing ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-[#0F2557]" />
              <p className="mt-2 text-sm font-medium text-slate-600">Compressing…</p>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                {isDragOver ? (
                  <FileImage className="h-5 w-5 text-[#0F2557]" />
                ) : (
                  <Upload className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <p className="mt-2 text-sm font-medium text-slate-700">
                {isDragOver ? 'Drop image here' : 'Click or drag to upload'}
              </p>
              <p className="mt-1 text-xs text-slate-500">JPG, PNG or WebP • Auto-compressed</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="sr-only"
            tabIndex={-1}
          />
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
