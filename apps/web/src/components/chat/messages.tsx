import { MyUIMessage } from "@/types/ai";
import { useChatMessages, useChatStatus } from "ai-sdk-zustand";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@agentset/ui/ai/conversation";

import { PreviewMessage } from "./message";

export function Messages() {
  const messages = useChatMessages<MyUIMessage>();
  const status = useChatStatus();

  return (
    <Conversation className="relative flex min-w-0 flex-1 pt-4">
      <ConversationContent className="flex flex-col gap-6 pb-32">
        {messages.map((message, index) => (
          <PreviewMessage
            key={message.id}
            message={message}
            isLoading={status === "streaming" && messages.length - 1 === index}
          />
        ))}
      </ConversationContent>

      <ConversationScrollButton />
    </Conversation>
  );
}
