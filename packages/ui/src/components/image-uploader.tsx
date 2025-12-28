"use client";

import type { Options } from "browser-image-compression";
import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { AlertCircleIcon, ImageUpIcon, LucideIcon, XIcon } from "lucide-react";

import { useFileUpload } from "../hooks/use-file-upload";

const DEFAULT_COMPRESSION_THRESHOLD_MB = 2;

async function compressImageIfNeeded(
  file: File,
  thresholdBytes: number,
): Promise<File> {
  if (file.size <= thresholdBytes) return file;

  try {
    const options = {
      maxSizeMB: thresholdBytes / 1024 / 1024,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    } satisfies Options;

    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error("Error compressing image:", error);
    return file;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export interface ImageUploaderProps {
  maxSizeMB?: number;
  compressionThresholdMB?: number;
  defaultImageUrl?: string | null;
  onImageChange?: (image: string | null) => void;
  icon?: LucideIcon;
  description?: string;
}

export function ImageUploader({
  maxSizeMB = 5,
  compressionThresholdMB = DEFAULT_COMPRESSION_THRESHOLD_MB,
  onImageChange,
  defaultImageUrl,
  icon: Icon = ImageUpIcon,
  description,
}: ImageUploaderProps) {
  const maxSize = maxSizeMB * 1024 * 1024;
  const compressionThresholdBytes = compressionThresholdMB * 1024 * 1024;

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "image/png,image/jpeg,image/jpg,image/gif,image/webp",
    maxSize,
    initialFiles: defaultImageUrl
      ? [
          {
            id: "default",
            url: defaultImageUrl,
            name: "default-image",
            size: 0,
            type: "image/*",
          },
        ]
      : undefined,
  });

  const [imageUrl, setImageUrl] = useState<string | null>(
    defaultImageUrl || null,
  );

  const fileId = files[0]?.id;
  const previewUrl = files[0]?.preview;
  const file = files[0]?.file;

  // Track previous fileId to detect new uploads
  const previousFileIdRef = useRef<string | undefined>(
    defaultImageUrl ? "default" : undefined,
  );

  // When a new file is uploaded, compress if needed, then convert to base64 and update
  useEffect(() => {
    async function processFile() {
      // Only process if it's a new file (not the default/initial one)
      if (
        file &&
        fileId &&
        fileId !== "default" &&
        fileId !== previousFileIdRef.current &&
        file instanceof File
      ) {
        try {
          // Compress image if it exceeds 2MB
          const processedFile = await compressImageIfNeeded(
            file,
            compressionThresholdBytes,
          );
          const base64 = await fileToBase64(processedFile);
          setImageUrl(previewUrl || base64);
          onImageChange?.(base64);
          previousFileIdRef.current = fileId;
        } catch (error) {
          console.error("Error processing file:", error);
        }
      }
    }
    processFile();
  }, [file, fileId, previewUrl]);

  function handleRemoveImage() {
    if (fileId) {
      removeFile(fileId);
    }
    if (imageUrl && imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(null);
    previousFileIdRef.current = undefined;
    onImageChange?.(null);
  }

  // Cleanup blob URLs on unmount
  useEffect(() => {
    const currentUrl = imageUrl;
    return () => {
      if (currentUrl && currentUrl.startsWith("blob:")) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [imageUrl]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        {/* Drop area */}
        <div
          className="border-input hover:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50 relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed p-4 transition-colors has-disabled:pointer-events-none has-disabled:opacity-50 has-[img]:border-none has-[input:focus]:ring-[3px]"
          data-dragging={isDragging || undefined}
          onClick={openFileDialog}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          tabIndex={-1}
        >
          <input
            {...getInputProps()}
            aria-label="Upload image"
            className="sr-only"
          />
          {imageUrl ? (
            <div className="absolute inset-0">
              <img
                alt="Uploaded image"
                className="size-full object-cover"
                src={imageUrl}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
              <div
                aria-hidden="true"
                className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
              >
                <Icon className="size-4 opacity-60" />
              </div>
              <p className="mb-1.5 text-sm font-medium">
                {description || "Drop your image here or click to browse"}
              </p>
              <p className="text-muted-foreground text-xs">
                Max size: {maxSizeMB}MB
              </p>
            </div>
          )}
        </div>
        {imageUrl && (
          <div className="absolute top-4 right-4">
            <button
              aria-label="Remove image"
              className="focus-visible:border-ring focus-visible:ring-ring/50 z-50 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px]"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
              type="button"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </button>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div
          className="text-destructive flex items-center gap-1 text-xs"
          role="alert"
        >
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}
    </div>
  );
}
