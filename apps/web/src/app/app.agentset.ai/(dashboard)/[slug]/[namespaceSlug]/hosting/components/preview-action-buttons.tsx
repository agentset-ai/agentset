import { ArrowUpRightIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";

interface PreviewActionButtonsProps {
  url: string;
  isDirty: boolean;
  isUpdating: boolean;
  onDiscard: () => void;
}

export function PreviewActionButtons({
  url,
  isDirty,
  isUpdating,
  onDiscard,
}: PreviewActionButtonsProps) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
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
  );
}
