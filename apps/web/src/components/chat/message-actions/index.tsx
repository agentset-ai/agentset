import { memo } from "react";
import { useIsHosting } from "@/contexts/hosting-context";
import { extractTextFromParts } from "@/lib/string-utils";
import { MyUIMessage } from "@/types/ai";
import { CopyIcon } from "lucide-react";
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

  if (isLoading) return null;
  if (message.role === "user") return null;

  return (
    <div className="flex flex-row gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="text-muted-foreground h-fit px-2 py-1"
            variant="outline"
            onClick={async () => {
              const textFromParts = extractTextFromParts(message.parts);

              if (!textFromParts) {
                toast.error("There's no text to copy!");
                return;
              }

              await copyToClipboard(textFromParts);
              toast.success("Copied to clipboard!");
            }}
          >
            <CopyIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy</TooltipContent>
      </Tooltip>

      {!isHosting && <MessageLogs message={message} />}
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
