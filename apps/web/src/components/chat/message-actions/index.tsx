import type { MyUIMessage } from "@/types/ai";
import { memo } from "react";
import { useIsHosting } from "@/contexts/hosting-context";
import { extractTextFromParts } from "@/lib/string-utils";
import { useChatProperty } from "ai-sdk-zustand";
import { CopyIcon, LogsIcon, RefreshCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import {
  MessageAction,
  MessageActions as MessageActionsComponent,
} from "@agentset/ui/ai/message";

import { useChatScroll } from "../use-chat-scroll";
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
  const { requestAnchor } = useChatScroll();

  // hide actions until the answer is complete
  if (message.role === "user" || isLoading) return null;

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
    requestAnchor();
    await regenerate();
  };

  return (
    <MessageActionsComponent className="mt-2">
      <MessageAction onClick={handleCopy} tooltip="Copy">
        <CopyIcon className="size-4" />
      </MessageAction>

      <MessageAction onClick={handleRegenerate} tooltip="Regenerate">
        <RefreshCcwIcon className="size-4" />
      </MessageAction>

      <ExportAction currentId={message.id} />

      {!isHosting && (
        <MessageLogs
          message={message}
          trigger={
            <MessageAction tooltip="Logs">
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
