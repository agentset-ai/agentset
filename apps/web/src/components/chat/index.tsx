"use client";

import { useHosting } from "@/contexts/hosting-context";

import { cn } from "@agentset/ui/cn";

import { MultimodalInput } from "./chat-input";
import { Messages } from "./messages";
import { Overview } from "./overview";
import { SuggestedActions } from "./suggested-actions";
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
  const { messages } = useNamespaceChat();

  return (
    <div
      className={cn(
        "bg-background flex min-w-0 flex-col",
        "h-[calc(100dvh-calc(var(--spacing)*20))]",
        // messages.length === 0 && "items-center justify-center",
      )}
    >
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <Overview />
        </div>
      ) : (
        <Messages />
      )}

      <div className="mx-auto flex w-full flex-col gap-4 px-4 pb-4 md:max-w-3xl md:pb-6">
        <MultimodalInput type="playground" />
      </div>
    </div>
  );
};

const HostingChat = () => {
  const { exampleQuestions, welcomeMessage, logo } = useHosting();
  const { messages } = useHostingChat();

  return (
    <div
      className={cn(
        "bg-background flex min-w-0 flex-col",
        "h-[calc(100dvh-64px)]",
        messages.length === 0 && "items-center justify-center",
      )}
    >
      {messages.length === 0 ? (
        <Overview
          title={welcomeMessage ?? "Start a conversation!"}
          logo={logo}
        />
      ) : (
        <Messages />
      )}

      <div className="mx-auto flex w-full flex-col gap-4 px-4 pb-4 md:max-w-3xl md:pb-6">
        <MultimodalInput type="hosted" />
        <SuggestedActions exampleMessages={["one", "two", "three", "four"]} />
      </div>
    </div>
  );
};
