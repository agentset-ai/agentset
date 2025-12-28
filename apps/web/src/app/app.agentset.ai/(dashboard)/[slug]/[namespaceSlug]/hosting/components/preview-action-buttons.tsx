"use client";

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
