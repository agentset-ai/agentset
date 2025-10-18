import { memo } from "react";
import { useIsHosting } from "@/contexts/hosting-context";
import { extractTextFromParts } from "@/lib/string-utils";
import { MyUIMessage } from "@/types/ai";
import { useChatProperty } from "ai-sdk-zustand";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui";

import MessageLogs from "./logs";

export function PureMessageActions({
  message,
  isLoading,
}: {
  message: MyUIMessage;
  isLoading: boolean;
}) {
  const [_, copyToClipboard] = useCopyToClipboard();
  const isHosting = useIsHosting();
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
    <div className="flex flex-row gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="text-muted-foreground rounded-full"
            variant="ghost"
            size="icon"
            disabled={isLoading}
            onClick={handleCopy}
          >
            <CopyIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="text-muted-foreground rounded-full"
            variant="ghost"
            size="icon"
            disabled={isLoading}
            onClick={handleRegenerate}
          >
            <RefreshCcwIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Regenerate</TooltipContent>
      </Tooltip>

      {!isHosting && <MessageLogs message={message} isLoading={isLoading} />}
    </div>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;

    return true;
  },
);
