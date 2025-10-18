import { useState } from "react";
import { sanitizeText } from "@/lib/string-utils";
import { MyUIMessage } from "@/types/ai";
import { useChatProperty, useChatStatus } from "ai-sdk-zustand";
import { PencilIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  cn,
  Logo,
  ShinyText,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@agentset/ui";
import { Action } from "@agentset/ui/components/ai-elements/actions";

import { Markdown } from "./markdown";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";

const MessageStatus = ({
  message,
  isLoading,
}: {
  message: MyUIMessage;
  isLoading: boolean;
}) => {
  if (message.role === "user") return null;

  // get the last item with type status
  const status = message.parts.find((p) => p.type === "data-status");
  const queries = message.parts.find((p) => p.type === "data-queries");

  if (!status)
    return (
      <ShinyText
        className="w-fit font-medium"
        shimmerWidth={40}
        disabled={!isLoading}
      >
        {isLoading ? "Generating answer..." : "Done!"}
      </ShinyText>
    );

  const queryString = queries
    ? queries.data.map((q, idx) => (
        <i key={idx}>
          {q}
          {idx < queries.data.length - 1 && ", "}
        </i>
      ))
    : null;

  // TODO: Searched for 1, 2, 3, +x other terms
  return (
    <ShinyText
      className="w-fit font-medium"
      shimmerWidth={status.data === "searching" ? 40 : 100}
      disabled={!isLoading}
    >
      {isLoading
        ? {
            "generating-queries": "Generating queries...",
            searching: "Searching for ",
            "generating-answer": "Searched for ",
          }[status.data]
        : "Searched for "}
      {queryString}
    </ShinyText>
  );
};

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
          <div className="flex items-center gap-2">
            {message.role === "assistant" && (
              <div className="ring-border bg-background flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
                <div className="translate-y-px">
                  <Logo className="size-3.5" />
                </div>
              </div>
            )}

            <MessageStatus message={message} isLoading={isLoading} />
          </div>

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
                        <Markdown message={message}>
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

export const ThinkingMessage = () => {
  const status = useChatStatus();
  const isLastMessageFromUser = useChatProperty(
    (s) =>
      s.messages.length > 0 &&
      s.messages[s.messages.length - 1]!.role === "user",
  );

  const shouldShow = status === "submitted" && isLastMessageFromUser;

  if (!shouldShow) return null;

  return (
    <PreviewMessage
      message={{
        id: "1",
        role: "assistant",
        parts: [],
      }}
      isLoading={true}
    />
  );
};
