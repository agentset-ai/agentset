import { ArrowUpRightIcon, CheckIcon, CopyIcon } from "lucide-react";
import { useCopyToClipboard } from "usehooks-ts";

import { Button } from "@agentset/ui/button";

interface DeploymentStatusBarProps {
  url: string;
}

export function DeploymentStatusBar({ url }: DeploymentStatusBarProps) {
  const [copiedText, copyToClipboard] = useCopyToClipboard();
  const isCopied = copiedText === url;

  const displayText = url.replace(/^https?:\/\//, "");

  return (
    <div className="bg-background flex items-center justify-between border-b pb-4">
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
          className="text-muted-foreground text-sm underline"
        >
          {displayText}
        </a>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => copyToClipboard(url)}
        >
          {isCopied ? (
            <CheckIcon className="size-4" />
          ) : (
            <CopyIcon className="size-4" />
          )}
          <span className="hidden sm:inline">Copy URL</span>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ArrowUpRightIcon className="size-4" />
            <span className="hidden sm:inline">Visit</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
