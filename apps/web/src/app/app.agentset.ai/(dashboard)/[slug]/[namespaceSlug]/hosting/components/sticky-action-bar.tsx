"use client";

import { ArrowUpRightIcon, CheckIcon, CopyIcon } from "lucide-react";
import { useCopyToClipboard } from "usehooks-ts";

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
  const [copiedText, copyToClipboard] = useCopyToClipboard();
  const isCopied = copiedText === url;

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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto p-0"
          onClick={() => copyToClipboard(url)}
        >
          {isCopied ? (
            <CheckIcon className="size-3.5" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </Button>
        <Button variant="ghost" size="sm" className="h-auto p-0" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ArrowUpRightIcon className="size-3.5" />
          </a>
        </Button>
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
