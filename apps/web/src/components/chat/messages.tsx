import { memo } from "react";
import { useMessages } from "@/hooks/use-messages";
import { MyUIMessage } from "@/types/ai";
import { useChatMessages, useChatStatus } from "ai-sdk-zustand";
import { motion } from "framer-motion";

import { PreviewMessage, ThinkingMessage } from "./message";
import { Overview } from "./overview";

interface MessagesProps {
  isReadonly: boolean;
  isArtifactVisible: boolean;
  overviewMessage?: string;
  logo?: string;
}

function PureMessages({ isReadonly, overviewMessage, logo }: MessagesProps) {
  const messages = useChatMessages<MyUIMessage>();
  const status = useChatStatus();
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  } = useMessages();

  return (
    <div
      ref={messagesContainerRef}
      className="relative flex min-w-0 flex-1 flex-col gap-6 overflow-y-scroll pt-4"
    >
      <Overview message={overviewMessage} logo={logo} />

      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          message={message}
          isLoading={status === "streaming" && messages.length - 1 === index}
          isReadonly={isReadonly}
          requiresScrollPadding={
            hasSentMessage && index === messages.length - 1
          }
        />
      ))}

      <ThinkingMessage />

      <motion.div
        ref={messagesEndRef}
        className="min-h-[24px] min-w-[24px] shrink-0"
        onViewportLeave={onViewportLeave}
        onViewportEnter={onViewportEnter}
      />
    </div>
  );
}

export const Messages = memo(PureMessages);
