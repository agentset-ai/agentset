import { memo } from "react";
import { useMessages } from "@/hooks/use-messages";
import { MyUseChat } from "@/types/ai";
import equal from "fast-deep-equal";
import { motion } from "framer-motion";

import { PreviewMessage, ThinkingMessage } from "./message";
import { Overview } from "./overview";

interface MessagesProps {
  chatId: string;
  status: MyUseChat["status"];
  messages: MyUseChat["messages"];
  setMessages: MyUseChat["setMessages"];
  regenerate: MyUseChat["regenerate"];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  overviewMessage?: string;
  logo?: string;
}

function PureMessages({
  chatId,
  status,
  messages,
  setMessages,
  regenerate,
  isReadonly,
  overviewMessage,
  logo,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  } = useMessages({
    chatId,
    status,
  });

  return (
    <div
      ref={messagesContainerRef}
      className="relative flex min-w-0 flex-1 flex-col gap-6 overflow-y-scroll pt-4"
    >
      {messages.length === 0 && (
        <Overview message={overviewMessage} logo={logo} />
      )}

      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          chatId={chatId}
          message={message}
          isLoading={status === "streaming" && messages.length - 1 === index}
          setMessages={setMessages}
          regenerate={regenerate}
          isReadonly={isReadonly}
          requiresScrollPadding={
            hasSentMessage && index === messages.length - 1
          }
        />
      ))}

      {status === "submitted" &&
        messages.length > 0 &&
        messages[messages.length - 1]!.role === "user" && <ThinkingMessage />}

      <motion.div
        ref={messagesEndRef}
        className="min-h-[24px] min-w-[24px] shrink-0"
        onViewportLeave={onViewportLeave}
        onViewportEnter={onViewportEnter}
      />
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;

  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;

  return true;
});
