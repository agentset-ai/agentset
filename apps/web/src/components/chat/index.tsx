"use client";

import { useHosting } from "@/contexts/hosting-context";
import { useChatProperty } from "ai-sdk-zustand";

import { cn } from "@agentset/ui/cn";

import { MultimodalInput } from "./chat-input";
import { Messages } from "./messages";
import { Overview } from "./overview";
import { SuggestedActions } from "./suggested-actions";
import { useNamespaceChat } from "./use-chat";

export default function Chat({
  type = "playground",
}: {
  type?: "playground" | "hosted";
}) {
  return type === "playground" ? <PlaygroundChat /> : <HostingChat />;
}

const PlaygroundChat = () => {
  useNamespaceChat();
  const isEmpty = useChatProperty((s) => s.messages.length === 0);

  return (
    <div className="bg-background flex h-[calc(100dvh-calc(var(--spacing)*20))] min-w-0 flex-col">
      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center">
          <Overview
            title="Welcome to the playground"
            description="Try chatting with your data here"
          />
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
  const isEmpty = useChatProperty((s) => s.messages.length === 0);

  return (
    <div
      className={cn(
        "bg-background flex h-[calc(100dvh-64px)] min-w-0 flex-col",
        isEmpty && "items-center justify-center",
      )}
    >
      {isEmpty ? <Overview title={welcomeMessage} logo={logo} /> : <Messages />}

      <div className="mx-auto flex w-full flex-col gap-4 px-4 pb-4 md:max-w-3xl md:pb-6">
        <MultimodalInput type="hosted" />
        <SuggestedActions exampleMessages={exampleQuestions} />
      </div>
    </div>
  );
};
