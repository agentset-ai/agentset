import type { UseFormReturn } from "react-hook-form";
import { APP_DOMAIN, HOSTING_PREFIX } from "@/lib/constants";
import { ImageIcon } from "lucide-react";

import type { HostingFormValues } from "../use-hosting-form";

interface SocialShareCardProps {
  form: UseFormReturn<HostingFormValues>;
}

export function SocialShareCard({ form }: SocialShareCardProps) {
  const ogTitle = form.watch("ogTitle");
  const ogDescription = form.watch("ogDescription");
  const ogImage = form.watch("ogImage");
  const slug = form.watch("slug");
  const title = form.watch("title");

  const displayUrl = `${APP_DOMAIN}${HOSTING_PREFIX}${slug}`.replace(
    /https?:\/\//g,
    "",
  );

  return (
    <div className="bg-muted/30 max-w-sm overflow-hidden rounded-lg border">
      {ogImage ? (
        <img
          src={ogImage}
          alt="Social preview"
          className="bg-muted h-40 w-full object-cover"
        />
      ) : (
        <div className="bg-muted flex h-40 w-full items-center justify-center">
          <div className="text-muted-foreground flex flex-col items-center gap-2">
            <ImageIcon className="size-8" />
            <span className="text-xs">No image set</span>
          </div>
        </div>
      )}

      <div className="space-y-1.5 p-3">
        <div className="text-muted-foreground truncate text-xs">
          {displayUrl}
        </div>
        <div className="line-clamp-1 text-sm font-medium">
          {ogTitle || title || "Your Title Here"}
        </div>
        <div className="text-muted-foreground line-clamp-2 text-xs">
          {ogDescription ||
            "Your description will appear here when shared on social media..."}
        </div>
      </div>
    </div>
  );
}
