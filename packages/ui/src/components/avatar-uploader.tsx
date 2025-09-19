"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ImageIcon,
  LucideIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";

import { FileMetadata, useFileUpload } from "../hooks/use-file-upload";
import {
  Cropper,
  CropperCropArea,
  CropperDescription,
  CropperImage,
} from "./cropper";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Slider } from "./ui/slider";

// Define type for pixel crop area
type Area = { x: number; y: number; width: number; height: number };

// Helper function to create a cropped image blob
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous"); // Needed for canvas Tainted check
    image.src = url;
  });

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number = pixelCrop.width, // Optional: specify output size
  outputHeight: number = pixelCrop.height,
  format: string = "image/jpg",
): Promise<Blob | null> {
  try {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return null;
    }

    // Set canvas size to desired output size
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // Draw the cropped image onto the canvas
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputWidth, // Draw onto the output size
      outputHeight,
    );

    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, format); // Specify format and quality if needed
    });
  } catch (error) {
    console.error("Error in getCroppedImg:", error);
    return null;
  }
}

export function AvatarUploader({
  maxSizeMB = 2,
  onImageChange,
  defaultImageUrl,
  icon: Icon = ImageIcon,
}: {
  maxSizeMB?: number;
  maxFiles?: number;
  defaultImageUrl?: string | null;
  onImageChange?: (image: string | null) => void;
  icon?: LucideIcon;
}) {
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

  const previewUrl = files[0]?.preview || null;
  const fileId = files[0]?.id;

  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(
    defaultImageUrl || null,
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Ref to track the previous file ID to detect new uploads
  const previousFileIdRef = useRef<string | undefined | null>(
    defaultImageUrl ? "default" : null,
  );

  // State to store the desired crop area in pixels
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // State for zoom level
  const [zoom, setZoom] = useState(1);

  // Callback for Cropper to provide crop data - Wrap with useCallback
  const handleCropChange = useCallback((pixels: Area | null) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApply = async () => {
    // Check if we have the necessary data
    if (!previewUrl || !fileId || !croppedAreaPixels) {
      console.error("Missing data for apply:", {
        previewUrl,
        fileId,
        croppedAreaPixels,
      });
      // Remove file if apply is clicked without crop data?
      if (fileId) {
        removeFile(fileId);
        setCroppedAreaPixels(null);
      }
      return;
    }

    try {
      const imageType = files[0]?.file.type || "image/jpg";

      // 1. Get the cropped image blob using the helper
      const croppedBlob = await getCroppedImg(
        previewUrl,
        croppedAreaPixels,
        undefined,
        undefined,
        imageType,
      );

      if (!croppedBlob) {
        throw new Error("Failed to generate cropped image blob.");
      }

      // 2. Create a NEW object URL from the cropped blob
      const newFinalUrl = URL.createObjectURL(croppedBlob);

      // 3. Revoke the OLD finalImageUrl if it exists
      if (finalImageUrl) {
        URL.revokeObjectURL(finalImageUrl);
      }

      // 4. Set the final avatar state to the NEW URL
      setFinalImageUrl(newFinalUrl);
      onImageChange?.(
        await fileToBase64(
          new File([croppedBlob], "cropped", { type: imageType }),
        ),
      );

      // 5. Close the dialog (don't remove the file yet)
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error during apply:", error);
      // Close the dialog even if cropping fails
      setIsDialogOpen(false);
    }
  };

  const handleRemoveFinalImage = () => {
    if (finalImageUrl) {
      URL.revokeObjectURL(finalImageUrl);
    }
    setFinalImageUrl(null);
    onImageChange?.(null);
  };

  useEffect(() => {
    const currentFinalUrl = finalImageUrl;
    // Cleanup function
    return () => {
      if (currentFinalUrl && currentFinalUrl.startsWith("blob:")) {
        URL.revokeObjectURL(currentFinalUrl);
      }
    };
  }, [finalImageUrl]);

  // Effect to open dialog when a *new* file is ready
  useEffect(() => {
    // Check if fileId exists and is different from the previous one
    if (fileId && fileId !== previousFileIdRef.current) {
      setIsDialogOpen(true); // Open dialog for the new file
      setCroppedAreaPixels(null); // Reset crop area for the new file
      setZoom(1); // Reset zoom for the new file
    }
    // Update the ref to the current fileId for the next render
    previousFileIdRef.current = fileId;
  }, [fileId]); // Depend only on fileId

  return (
    <div className="flex w-fit flex-col gap-2">
      <div className="relative inline-flex">
        {/* Drop area - uses finalImageUrl */}
        <button
          className="border-input hover:bg-accent/50 data-[dragging=true]:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 relative flex size-16 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-dashed transition-colors outline-none focus-visible:ring-[3px] has-disabled:pointer-events-none has-disabled:opacity-50 has-[img]:border-none"
          type="button"
          onClick={openFileDialog}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}
          aria-label={finalImageUrl ? "Change image" : "Upload image"}
        >
          {finalImageUrl ? (
            <img
              className="size-full object-cover"
              src={finalImageUrl}
              alt="User avatar"
              width={64}
              height={64}
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div aria-hidden="true">
              <Icon className="size-4 opacity-60" />
            </div>
          )}
        </button>
        {/* Remove button - depends on finalImageUrl */}
        {finalImageUrl && (
          <Button
            onClick={handleRemoveFinalImage}
            size="icon"
            className="border-background focus-visible:border-background absolute -top-1 -right-1 size-6 rounded-full border-2 shadow-none"
            aria-label="Remove image"
            type="button"
          >
            <XIcon className="size-3.5" />
          </Button>
        )}
        <input
          {...getInputProps()}
          className="sr-only"
          aria-label="Upload image file"
          tabIndex={-1}
        />
      </div>
      <div>
        {errors.length > 0 && (
          <div className="text-destructive flex items-center gap-1 text-xs">
            <AlertCircleIcon className="size-3 shrink-0" />
            <span>{errors[0]}</span>
          </div>
        )}
      </div>

      {/* Cropper Dialog - Use isDialogOpen for open prop */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-140 *:[button]:hidden">
          <DialogDescription className="sr-only">
            Crop image dialog
          </DialogDescription>
          <DialogHeader className="contents space-y-0 text-left">
            <DialogTitle className="flex items-center justify-between border-b p-4 text-base">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="-my-1 opacity-60"
                  onClick={() => setIsDialogOpen(false)}
                  aria-label="Cancel"
                >
                  <ArrowLeftIcon aria-hidden="true" />
                </Button>
                <span>Crop image</span>
              </div>
              <Button
                className="-my-1"
                onClick={handleApply}
                disabled={!previewUrl}
                type="button"
                autoFocus
              >
                Apply
              </Button>
            </DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <Cropper
              className="h-96 sm:h-120"
              image={previewUrl}
              zoom={zoom}
              onCropChange={handleCropChange}
              onZoomChange={setZoom}
            >
              <CropperDescription />
              <CropperImage />
              <CropperCropArea />
            </Cropper>
          )}
          <DialogFooter className="border-t px-4 py-6">
            <div className="mx-auto flex w-full max-w-80 items-center gap-4">
              <ZoomOutIcon
                className="shrink-0 opacity-60"
                size={16}
                aria-hidden="true"
              />
              <Slider
                defaultValue={[1]}
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value) => setZoom(value[0]!)}
                aria-label="Zoom slider"
              />
              <ZoomInIcon
                className="shrink-0 opacity-60"
                size={16}
                aria-hidden="true"
              />
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
