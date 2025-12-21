"use client";

import { ArrowUpRightIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";

interface StickyActionBarProps {
  url: string;
  isDirty: boolean;
  isUpdating: boolean;
  onDiscard: () => void;
}

export function StickyActionBar({
  url,
  isDirty,
  isUpdating,
  onDiscard,
}: StickyActionBarProps) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }

  return (
    <div className="bg-background sticky top-0 z-10 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-full w-full rounded-full bg-green-500" />
          </span>
          <span className="text-sm font-medium">Your deployment is live!</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hidden text-sm underline sm:inline"
        >
          {url.replace("https://", "").replace("http://", "")}
        </a>
      </div>

      <div className="flex items-center gap-2">
        {isDirty && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            disabled={isUpdating}
          >
            Discard
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          <CopyIcon className="size-4" />
          <span className="hidden sm:inline">Copy URL</span>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ArrowUpRightIcon className="size-4" />
            <span className="hidden sm:inline">Visit</span>
          </a>
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!isDirty}
          isLoading={isUpdating}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
