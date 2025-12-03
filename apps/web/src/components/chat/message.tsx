import { useState } from "react";
import { sanitizeText } from "@/lib/string-utils";
import { MyUIMessage } from "@/types/ai";
import { PencilIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Action } from "@agentset/ui/ai/actions";
import { cn } from "@agentset/ui/cn";
import { Logo } from "@agentset/ui/logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui/tooltip";

import { Markdown } from "./markdown";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { MessageStatus } from "./message-status";

export const PreviewMessage = ({
  message,
  isLoading,
}: {
  message: MyUIMessage;
  isLoading: boolean;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  return (
    <AnimatePresence>
      <motion.div
        className="group/message mx-auto w-full max-w-3xl px-4"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex w-full flex-col gap-2 group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            mode === "edit" ? "w-full" : "group-data-[role=user]/message:w-fit",
          )}
        >
          {message.role === "assistant" && (
            <div className="mb-2 flex flex-col">
              <div className="ring-border bg-background flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
                <div className="translate-y-px">
                  <Logo className="size-3.5" />
                </div>
              </div>

              <MessageStatus message={message} isLoading={isLoading} />
            </div>
          )}

          <div className="flex w-full flex-col gap-4">
            {message.parts.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === "reasoning") {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.text}
                  />
                );
              }

              if (type === "text") {
                if (mode === "view") {
                  return (
                    <div key={key} className="flex flex-row items-start gap-2">
                      {message.role === "user" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Action
                              className="opacity-0 group-hover/message:opacity-100"
                              onClick={() => setMode("edit")}
                            >
                              <PencilIcon />
                            </Action>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        className={cn(
                          "flex flex-col gap-4",
                          message.role === "user" &&
                            "bg-primary text-primary-foreground rounded-xl px-3 py-2",
                        )}
                      >
                        <Markdown message={message} isLoading={isLoading}>
                          {sanitizeText(part.text)}
                        </Markdown>
                      </div>
                    </div>
                  );
                }

                if (mode === "edit") {
                  return (
                    <div key={key} className="flex flex-row items-start gap-2">
                      <div className="size-8" />
                      <MessageEditor message={message} setMode={setMode} />
                    </div>
                  );
                }
              }
            })}
          </div>

          <MessageActions
            key={`action-${message.id}`}
            message={message}
            isLoading={isLoading}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
