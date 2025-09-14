"use client";

import { useState } from "react";
import { useHosting } from "@/contexts/hosting-context";

import { cn } from "@agentset/ui";

import { MultimodalInput } from "./chat-input";
import { Messages } from "./messages";
import { useNamespaceChat } from "./use-chat";
import { useHostingChat } from "./use-hosting-chat";

export default function Chat({
  type = "playground",
}: {
  type?: "playground" | "hosted";
}) {
  return type === "playground" ? <PlaygroundChat /> : <HostingChat />;
}

const PlaygroundChat = () => {
  const [input, setInput] = useState("");
  const {
    id,
    messages,
    setMessages,
    status,

    sendMessage,
    stop,
    regenerate,
  } = useNamespaceChat();

  return (
    <div
      className={cn(
        "bg-background flex min-w-0 flex-col",
        "h-[calc(100dvh-calc(var(--spacing)*20))]",
      )}
    >
      <Messages
        chatId={id}
        status={status}
        messages={messages}
        setMessages={setMessages}
        regenerate={regenerate}
        isReadonly={false}
        isArtifactVisible={false}
      />

      <form className="bg-background mx-auto flex w-full gap-2 px-4 pb-4 md:max-w-3xl md:pb-6">
        <MultimodalInput
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          status={status}
          stop={stop}
          messages={messages}
          setMessages={setMessages}
          type="playground"
        />
      </form>
    </div>
  );
};

const HostingChat = () => {
  const { exampleQuestions, welcomeMessage, logo } = useHosting();
  const [input, setInput] = useState("");
  const {
    id,
    messages,
    setMessages,
    status,

    sendMessage,
    stop,
    regenerate,
  } = useHostingChat();

  return (
    <div
      className={cn(
        "bg-background flex min-w-0 flex-col",
        "h-[calc(100dvh-64px)]",
      )}
    >
      <Messages
        chatId={id}
        status={status}
        messages={messages}
        setMessages={setMessages}
        regenerate={regenerate}
        isReadonly={false}
        isArtifactVisible={false}
        overviewMessage={welcomeMessage ?? undefined}
        logo={logo ?? undefined}
      />

      <form className="bg-background mx-auto flex w-full gap-2 px-4 pb-4 md:max-w-3xl md:pb-6">
        <MultimodalInput
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          status={status}
          stop={stop}
          messages={messages}
          setMessages={setMessages}
          type="hosted"
          exampleMessages={exampleQuestions}
        />
      </form>
    </div>
  );
};
