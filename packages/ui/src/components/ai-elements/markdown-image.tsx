import type { DetailedHTMLProps, ImgHTMLAttributes } from "react";
import { DownloadIcon } from "lucide-react";

import { cn } from "@agentset/ui/cn";

const fileExtensionPattern = /\.[^/.]+$/;

export const save = (
  filename: string,
  content: string | Blob,
  mimeType: string,
) => {
  const blob =
    typeof content === "string"
      ? new Blob([content], { type: mimeType })
      : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

type ImageComponentProps = DetailedHTMLProps<
  ImgHTMLAttributes<HTMLImageElement>,
  HTMLImageElement
> & {
  node?: Element | undefined;
};

export const ImageComponent = ({
  node,
  className,
  src,
  alt,
  ...props
}: ImageComponentProps) => {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: "Complex image download logic with multiple edge cases"
  const downloadImage = async () => {
    if (!src) {
      return;
    }

    try {
      // @ts-ignore
      const response = await fetch(src);
      const blob = await response.blob();

      // Extract filename from URL or use alt text with proper extension
      // @ts-ignore
      const urlPath = new URL(src, window.location.origin).pathname;
      const originalFilename = urlPath.split("/").pop() || "";
      const extension = originalFilename.split(".").pop();
      const hasExtension =
        originalFilename.includes(".") &&
        extension !== undefined &&
        extension.length <= 4;

      let filename = "";

      if (hasExtension) {
        filename = originalFilename;
      } else {
        // Determine extension from blob type
        const mimeType = blob.type;
        let fileExtension = "png"; // default

        if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
          fileExtension = "jpg";
        } else if (mimeType.includes("png")) {
          fileExtension = "png";
        } else if (mimeType.includes("svg")) {
          fileExtension = "svg";
        } else if (mimeType.includes("gif")) {
          fileExtension = "gif";
        } else if (mimeType.includes("webp")) {
          fileExtension = "webp";
        }

        const baseName = alt || originalFilename || "image";
        filename = `${baseName.replace(fileExtensionPattern, "")}.${fileExtension}`;
      }

      save(filename, blob, blob.type);
    } catch (error) {
      console.error("Failed to download image:", error);
    }
  };

  if (!src) {
    return null;
  }

  return (
    <div className="my-4 inline-block">
      <div
        className="group relative inline-block"
        data-streamdown="image-wrapper"
      >
        <img
          alt={alt}
          className={cn("max-w-full rounded-lg", className)}
          data-streamdown="image"
          src={src}
          {...props}
        />

        <div className="pointer-events-none absolute inset-0 hidden rounded-lg bg-black/10 group-hover:block" />

        <button
          className={cn(
            "border-border bg-background/90 hover:bg-background absolute right-2 bottom-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border shadow-sm backdrop-blur-sm transition-all duration-200",
            "opacity-0 group-hover:opacity-100",
          )}
          onClick={downloadImage}
          title="Download image"
          type="button"
        >
          <DownloadIcon size={14} />
        </button>
      </div>

      {alt && (
        <p className="text-muted-foreground w-full text-xs italic" aria-hidden>
          {alt}
        </p>
      )}
    </div>
  );
};
