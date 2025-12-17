"use client";

import { useEffect, useState } from "react";
import { AlertCircleIcon, ImageIcon, LucideIcon, XIcon } from "lucide-react";

import { FileMetadata, useFileUpload } from "../hooks/use-file-upload";
import { Button } from "./ui/button";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

export interface ImageUploaderProps {
  maxSizeMB?: number;
  defaultImageUrl?: string | null;
  onImageChange?: (image: string | null) => void;
  icon?: LucideIcon;
  description?: string;
}

export function ImageUploader({
  maxSizeMB = 2,
  onImageChange,
  defaultImageUrl,
  icon: Icon = ImageIcon,
  description,
}: ImageUploaderProps) {
  const maxSize = maxSizeMB * 1024 * 1024;
  const [
    { files, errors, isDragging },
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
    maxFiles: 1,
    maxSize,
    initialFiles: defaultImageUrl
      ? [{ id: "default", url: defaultImageUrl } as FileMetadata]
      : undefined,
  });

  const [imageUrl, setImageUrl] = useState<string | null>(
    defaultImageUrl || null,
  );

  const fileId = files[0]?.id;
  const previewUrl = files[0]?.preview;
  const file = files[0]?.file;

  // When a new file is uploaded, convert to base64 and update
  useEffect(() => {
    async function processFile() {
      if (file && fileId && fileId !== "default") {
        try {
          const base64 = await fileToBase64(file);
          setImageUrl(previewUrl || base64);
          onImageChange?.(base64);
        } catch (error) {
          console.error("Error converting file to base64:", error);
        }
      }
    }
    processFile();
  }, [file, fileId, previewUrl, onImageChange]);

  const handleRemoveImage = () => {
    if (fileId) {
      removeFile(fileId);
    }
    if (imageUrl && imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(null);
    onImageChange?.(null);
  };

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
    <div className="flex w-full flex-col gap-2">
      <div className="relative">
        {imageUrl ? (
          <div className="relative inline-block">
            <div className="border-input relative overflow-hidden rounded-lg border">
              <img
                src={imageUrl}
                alt="Uploaded image"
                className="max-h-48 w-auto object-contain"
              />
            </div>
            <Button
              onClick={handleRemoveImage}
              size="icon"
              className="border-background focus-visible:border-background absolute -top-2 -right-2 size-6 rounded-full border-2 shadow-none"
              aria-label="Remove image"
              type="button"
            >
              <XIcon className="size-3.5" />
            </Button>
          </div>
        ) : (
          <button
            className="border-input hover:bg-accent/50 data-[dragging=true]:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 relative flex h-32 w-full max-w-sm items-center justify-center overflow-hidden rounded-lg border-[1.5px] border-dashed transition-colors outline-none focus-visible:ring-[3px] has-disabled:pointer-events-none has-disabled:opacity-50"
            type="button"
            onClick={openFileDialog}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            data-dragging={isDragging || undefined}
            aria-label="Upload image"
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <Icon className="text-muted-foreground size-8 opacity-60" />
              <span className="text-muted-foreground text-sm">
                {description || "Click or drag to upload"}
              </span>
            </div>
          </button>
        )}
        <input
          {...getInputProps()}
          className="sr-only"
          aria-label="Upload image file"
          tabIndex={-1}
        />
      </div>
      {errors.length > 0 && (
        <div className="text-destructive flex items-center gap-1 text-xs">
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}
    </div>
  );
}
