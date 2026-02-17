import { memo } from "react";
import { useIsHosting } from "@/contexts/hosting-context";
import { extractTextFromParts } from "@/lib/string-utils";
import { MyUIMessage } from "@/types/ai";
import { useChatProperty } from "ai-sdk-zustand";
import { CopyIcon, LogsIcon, RefreshCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import {
  MessageAction,
  MessageActions as MessageActionsComponent,
} from "@agentset/ui/ai/message";

import { ExportAction } from "./export";
import MessageLogs from "./logs";

function PureMessageActions({
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
    <MessageActionsComponent className="mt-2">
      <MessageAction disabled={isLoading} onClick={handleCopy} tooltip="Copy">
        <CopyIcon className="size-4" />
      </MessageAction>

      <MessageAction
        disabled={isLoading}
        onClick={handleRegenerate}
        tooltip="Regenerate"
      >
        <RefreshCcwIcon className="size-4" />
      </MessageAction>

      <ExportAction currentId={message.id} disabled={isLoading} />

      {!isHosting && (
        <MessageLogs
          message={message}
          trigger={
            <MessageAction disabled={isLoading} tooltip="Logs">
              <LogsIcon className="size-4" />
            </MessageAction>
          }
        />
      )}
    </MessageActionsComponent>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;

    return true;
  },
);
