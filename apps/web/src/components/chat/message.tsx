"use client";

import { memo, useState } from "react";
import { sanitizeText } from "@/lib/string-utils";
import { MyUIMessage, MyUseChat } from "@/types/ai";
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

const Annotations = ({
  message,
  isLoading,
}: {
  message: MyUIMessage;
  isLoading: boolean;
}) => {
  // get the last item with type status
  const statuses = message.parts.filter((a) => a.type === "data-status");

  if (statuses.length === 0) return null;

  const reversed = statuses.reverse().map((s) => s.data);
  // we reverse the statuses to get the latest queries
  const queries = reversed.find((s) => s.value === "searching")?.queries;

  const queryString = queries
    ? queries.map((q, idx) => (
        <i key={idx}>
          {q.query}
          {idx < queries.length - 1 && ", "}
        </i>
      ))
    : null;

  // get the first item (latest) with type status
  const status = reversed[0]!;

  // TODO: Searched for 1, 2, 3, +x other terms
  return (
    <ShinyText
      className="w-fit font-medium"
      shimmerWidth={status.value === "searching" ? 40 : 100}
      disabled={!isLoading}
    >
      {isLoading
        ? {
            "generating-queries": "Generating queries...",
            searching: "Searching for ",
            "generating-answer": "Searched for ",
          }[status.value]
        : "Searched for "}
      {queryString}
    </ShinyText>
  );
};

const PurePreviewMessage = ({
  chatId,
  message,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding,
}: {
  chatId: string;
  message: MyUIMessage;
  isLoading: boolean;
  setMessages: MyUseChat["setMessages"];
  regenerate: MyUseChat["regenerate"];
  isReadonly: boolean;
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
            <Annotations message={message} isLoading={isLoading} />

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
                      {message.role === "user" && !isReadonly && (
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

                      <MessageEditor
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        regenerate={regenerate}
                      />
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

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;

    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding)
      return false;

    return true;
  },
);

export const ThinkingMessage = () => {
  const role = "assistant";

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="group/message mx-auto w-full max-w-3xl px-4"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cn(
          "flex w-full gap-4 rounded-xl group-data-[role=user]/message:ml-auto group-data-[role=user]/message:w-fit group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:px-3 group-data-[role=user]/message:py-2",
          "group-data-[role=user]/message:bg-muted",
        )}
      >
        <div className="ring-border flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
          <SparklesIcon className="size-3.5" />
        </div>

        <div className="flex w-full flex-col gap-2">
          <div className="text-muted-foreground flex flex-col gap-4">
            Hmm...
          </div>
        </div>
      </div>
    </motion.div>
  );
};
