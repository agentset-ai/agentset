import { memo, useRef, useState } from "react";
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

function PureMultimodalInput({ type }: { type: "playground" | "hosted" }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");

  const totalMessages = useChatMessageCount();
  const sendMessage = useChatSendMessage();
  const status = useChatStatus();
  const stop = useChatProperty((s) => s.stop);
  const setMessages = useChatProperty((s) => s.setMessages);

  const handleSubmit = (message: PromptInputMessage) => {
    // If currently streaming or submitted, stop instead of submitting
    if (status === "streaming" || status === "submitted") {
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

    setInput("");
  };

  //     {exampleMessages && exampleMessages.length > 0 && (
  //       <SuggestedActions exampleMessages={exampleMessages} />
  //     )}

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
        <PromptInputTools>
          <ChatInputModes />
        </PromptInputTools>

        <PromptInputSubmit
          className="h-8"
          status={status}
          disabled={input.length === 0}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}

export const MultimodalInput = memo(PureMultimodalInput);
