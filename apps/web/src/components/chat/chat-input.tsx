import type React from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useIsHosting } from "@/contexts/hosting-context";
import { logEvent } from "@/lib/analytics";
import {
  useChatMessageCount,
  useChatProperty,
  useChatSendMessage,
  useChatStatus,
} from "ai-sdk-zustand";
import { ArrowUpIcon } from "lucide-react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";

import { Button, cn, Skeleton, Textarea } from "@agentset/ui";

import { SuggestedActions } from "./suggested-actions";

const ChatInputModes = dynamic(() => import("./chat-input-modes"), {
  ssr: false,
  loading: () => (
    <div className="absolute bottom-0 left-0 flex w-fit flex-row justify-end gap-2 p-2">
      <Skeleton className="h-8 w-23 rounded-full" />
      <Skeleton className="h-8 w-36 rounded-full" />
    </div>
  ),
});

function PureMultimodalInput({
  className,
  type,
  exampleMessages,
}: {
  className?: string;
  type: "playground" | "hosted";
  exampleMessages?: string[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const isHosting = useIsHosting();
  const [input, setInput] = useState("");

  const totalMessages = useChatMessageCount();
  const sendMessage = useChatSendMessage();
  const status = useChatStatus();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = isHosting ? "96px" : "112px";
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    "",
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const submitForm = useCallback(() => {
    logEvent("chat_message_sent", {
      type: type,
      messageLength: input.length,
      hasExistingMessages: totalMessages > 0,
    });

    sendMessage({
      role: "user",
      parts: [
        {
          type: "text",
          text: input,
        },
      ],
    });

    setLocalStorageInput("");
    setInput("");
    resetHeight();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    sendMessage,
    setInput,
    setLocalStorageInput,
    width,
    input.length,
    totalMessages,
    type,
  ]);

  return (
    <div className="relative flex w-full flex-col gap-4">
      {exampleMessages && exampleMessages.length > 0 && (
        <SuggestedActions exampleMessages={exampleMessages} />
      )}

      <Textarea
        data-testid="multimodal-input"
        ref={textareaRef}
        placeholder="Send a message..."
        value={input}
        onChange={handleInput}
        className={cn(
          "bg-muted resize-none overflow-hidden text-base",
          isHosting
            ? "max-h-[75dvh] min-h-24 rounded-2xl pt-3 pb-10"
            : "max-h-[35dvh] min-h-28 rounded-lg pt-3 pb-14",

          className,
        )}
        rows={2}
        autoFocus
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();

            if (status !== "ready") {
              toast.error("Please wait for the model to finish its response!");
            } else {
              submitForm();
            }
          }
        }}
      />

      {type === "playground" && <ChatInputModes />}

      <div className="absolute right-0 bottom-0 flex w-fit flex-row justify-end p-2">
        {status === "submitted" || status === "streaming" ? (
          <StopButton />
        ) : (
          <SendButton input={input} submitForm={submitForm} />
        )}
      </div>
    </div>
  );
}

export const MultimodalInput = memo(PureMultimodalInput);

function PureStopButton() {
  const stop = useChatProperty((s) => s.stop);
  const setMessages = useChatProperty((s) => s.setMessages);

  return (
    <Button
      data-testid="stop-button"
      size="icon"
      className="rounded-full"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-4"
      >
        <path
          fillRule="evenodd"
          d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z"
          clipRule="evenodd"
        />
      </svg>
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
}: {
  submitForm: () => void;
  input: string;
}) {
  return (
    <Button
      data-testid="send-button"
      size="icon"
      className="rounded-full"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.length === 0}
    >
      <ArrowUpIcon className="size-4" />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
