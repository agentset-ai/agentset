"use client";

import { useState } from "react";
import { sanitizeText } from "@/lib/string-utils";
import { MyUIMessage } from "@/types/ai";
import { useChatProperty, useChatStatus } from "ai-sdk-zustand";
import { AnimatePresence, motion } from "framer-motion";
import { PencilIcon, SparklesIcon } from "lucide-react";

import {
  Button,
  cn,
  ShinyText,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@agentset/ui";

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
  // get the last item with type status
  const status = message.parts.find((a) => a.type === "data-status");
  const queries = message.parts.find((a) => a.type === "data-queries");

  if (!status)
    return isLoading ? (
      <ShinyText
        className="w-fit font-medium"
        shimmerWidth={40}
        disabled={!isLoading}
      >
        Generating answer...
      </ShinyText>
    ) : null;

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
  requiresScrollPadding,
}: {
  message: MyUIMessage;
  isLoading: boolean;
  requiresScrollPadding: boolean;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="group/message mx-auto w-full max-w-3xl px-4"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex w-full gap-4 group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            mode === "edit" ? "w-full" : "group-data-[role=user]/message:w-fit",
          )}
        >
          {message.role === "assistant" && (
            <div className="ring-border bg-background flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
              <div className="translate-y-px">
                <SparklesIcon className="size-3.5" />
              </div>
            </div>
          )}

          <div
            className={cn(
              "flex w-full flex-col gap-4",
              requiresScrollPadding && message.role === "assistant"
                ? "min-h-96"
                : "",
            )}
          >
            <MessageStatus message={message} isLoading={isLoading} />

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
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground rounded-full opacity-0 group-hover/message:opacity-100"
                              onClick={() => setMode("edit")}
                            >
                              <PencilIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        data-testid="message-content"
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

              // if (type === "tool-invocation") {
              //   const { toolInvocation } = part;
              //   const { toolName, toolCallId, state } = toolInvocation;

              // if (state === "call") {
              //   const { args } = toolInvocation;

              //   return (
              //     <div
              //       key={toolCallId}
              //       className={cn({
              //         skeleton: ["getWeather"].includes(toolName),
              //       })}
              //     >
              //       {toolName === "getWeather" ? (
              //         <Weather />
              //       ) : toolName === "createDocument" ? (
              //         <DocumentPreview isReadonly={isReadonly} args={args} />
              //       ) : toolName === "updateDocument" ? (
              //         <DocumentToolCall
              //           type="update"
              //           args={args}
              //           isReadonly={isReadonly}
              //         />
              //       ) : toolName === "requestSuggestions" ? (
              //         <DocumentToolCall
              //           type="request-suggestions"
              //           args={args}
              //           isReadonly={isReadonly}
              //         />
              //       ) : null}
              //     </div>
              //   );
              // }

              // if (state === "result") {
              //   const { result } = toolInvocation;

              //   return (
              //     <div key={toolCallId}>
              //       {toolName === "getWeather" ? (
              //         <Weather weatherAtLocation={result} />
              //       ) : toolName === "createDocument" ? (
              //         <DocumentPreview
              //           isReadonly={isReadonly}
              //           result={result}
              //         />
              //       ) : toolName === "updateDocument" ? (
              //         <DocumentToolResult
              //           type="update"
              //           result={result}
              //           isReadonly={isReadonly}
              //         />
              //       ) : toolName === "requestSuggestions" ? (
              //         <DocumentToolResult
              //           type="request-suggestions"
              //           result={result}
              //           isReadonly={isReadonly}
              //         />
              //       ) : (
              //         <pre>{JSON.stringify(result, null, 2)}</pre>
              //       )}
              //     </div>
              //   );
              // }
              // }
            })}

            <MessageActions
              key={`action-${message.id}`}
              message={message}
              isLoading={isLoading}
            />
          </div>
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
      requiresScrollPadding
    />
  );
};
