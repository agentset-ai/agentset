import { memo } from "react";
import { extractTextFromParts } from "@/lib/string-utils";
import { MyUIMessage } from "@/types/ai";
import { useChatProperty } from "ai-sdk-zustand";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import { Action, Actions } from "@agentset/ui/ai/actions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui/tooltip";

import { ExportAction } from "./export";

function PureMessageActions({
  message,
  isLoading,
}: {
  message: MyUIMessage;
  isLoading: boolean;
}) {
  const [_, copyToClipboard] = useCopyToClipboard();
  const regenerate = useChatProperty((a) => a.regenerate);

  if (message.role === "user") return null;

  const handleCopy = async () => {
    const textFromParts = extractTextFromParts(message.parts);

    if (!textFromParts) {
      toast.error("There's no text to copy!");
      return;
    }

    await copyToClipboard(textFromParts);
    toast.success("Copied to clipboard!");
  };

  const handleRegenerate = async () => {
    await regenerate();
  };

  return (
    <Actions className="mt-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Action disabled={isLoading} onClick={handleCopy}>
            <CopyIcon className="size-4" />
          </Action>
        </TooltipTrigger>
        <TooltipContent>Copy</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Action disabled={isLoading} onClick={handleRegenerate}>
            <RefreshCcwIcon className="size-4" />
          </Action>
        </TooltipTrigger>
        <TooltipContent>Regenerate</TooltipContent>
      </Tooltip>

      <ExportAction currentId={message.id} disabled={isLoading} />
    </Actions>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;

    return true;
  },
);
