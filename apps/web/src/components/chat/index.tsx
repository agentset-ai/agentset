"use client";

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
  useNamespaceChat();

  return (
    <div
      className={cn(
        "bg-background flex min-w-0 flex-col",
        "h-[calc(100dvh-calc(var(--spacing)*20))]",
      )}
    >
      <Messages />

      <form className="bg-background mx-auto flex w-full gap-2 px-4 pb-4 md:max-w-3xl md:pb-6">
        <MultimodalInput type="playground" />
      </form>
    </div>
  );
};

const HostingChat = () => {
  const { exampleQuestions, welcomeMessage, logo } = useHosting();
  useHostingChat();

  return (
    <div
      className={cn(
        "bg-background flex min-w-0 flex-col",
        "h-[calc(100dvh-64px)]",
      )}
    >
      <Messages
        overviewMessage={welcomeMessage ?? undefined}
        logo={logo ?? undefined}
      />

      <form className="bg-background mx-auto flex w-full gap-2 px-4 pb-4 md:max-w-3xl md:pb-6">
        <MultimodalInput type="hosted" exampleMessages={exampleQuestions} />
      </form>
    </div>
  );
};
