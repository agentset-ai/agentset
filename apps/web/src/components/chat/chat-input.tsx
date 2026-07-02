import type { Dispatch, RefObject, SetStateAction } from "react";
import { memo } from "react";
import { logEvent } from "@/lib/analytics";
import {
  useChatMessageCount,
  useChatProperty,
  useChatSendMessage,
  useChatStatus,
} from "ai-sdk-zustand";

import type { PromptInputMessage } from "@agentset/ui/ai/prompt-input";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@agentset/ui/ai/prompt-input";

import ChatInputModes from "./chat-input-modes";
import ChatModel from "./chat-model";
import { useChatScroll } from "./use-chat-scroll";

function PureMultimodalInput({
  type,
  input,
  setInput,
  textareaRef,
}: {
  type: "playground" | "hosted";
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const totalMessages = useChatMessageCount();
  const sendMessage = useChatSendMessage();
  const status = useChatStatus();
  const stop = useChatProperty((s) => s.stop);
  const setMessages = useChatProperty((s) => s.setMessages);
  const { requestAnchor } = useChatScroll();

  const handleSubmit = (message: PromptInputMessage) => {
    // If currently streaming or submitted, stop instead of submitting
    if (status === "streaming") {
      stop();
      setMessages((messages) => messages);
      return;
    }

    const text = message.text;
    if (!text) return;

    logEvent("chat_message_sent", {
      type: type,
      messageLength: text.length,
      hasExistingMessages: totalMessages > 0,
    });

    sendMessage({
      role: "user",
      parts: [
        {
          type: "text",
          text,
        },
      ],
    });

    // Anchor the just-sent message near the top of the conversation.
    requestAnchor();
    setInput("");
  };

  return (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputBody>
        <PromptInputTextarea
          onChange={(e) => setInput(e.target.value)}
          ref={textareaRef}
          value={input}
          placeholder="Send a message..."
        />
      </PromptInputBody>

      <PromptInputFooter>
        {type === "playground" ? (
          <PromptInputTools>
            <ChatInputModes />
            <ChatModel />
          </PromptInputTools>
        ) : (
          <div />
        )}

        <PromptInputSubmit
          className="h-8"
          status={status}
          disabled={
            (status === "ready" && input.length === 0) || status === "submitted"
          }
        />
      </PromptInputFooter>
    </PromptInput>
  );
}

export const MultimodalInput = memo(PureMultimodalInput);
