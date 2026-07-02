"use client";

import { useCallback, useRef, useState } from "react";
import { useHosting } from "@/contexts/hosting-context";
import { useNamespace } from "@/hooks/use-namespace";
import { useChatProperty } from "ai-sdk-zustand";

import { getDemoTemplate } from "@agentset/demo";
import { cn } from "@agentset/ui/cn";

import { MultimodalInput } from "./chat-input";
import { Messages } from "./messages";
import { Overview } from "./overview";
import { SuggestedActions } from "./suggested-actions";
import { useNamespaceChat } from "./use-chat";
import { ChatScrollProvider } from "./use-chat-scroll";
import { useHostingChat } from "./use-hosting-chat";

export default function Chat({
  type = "playground",
}: {
  type?: "playground" | "hosted";
}) {
  return (
    <ChatScrollProvider>
      {type === "playground" ? <PlaygroundChat /> : <HostingChat />}
    </ChatScrollProvider>
  );
}

// Owns the composer state so typing re-renders only this subtree, not the
// chat root. Suggestions fill the input (leaving the user in control of
// sending) and fade out once it has content.
function ChatComposer({
  type,
  exampleMessages,
  suggestionsPlacement = "above",
}: {
  type: "playground" | "hosted";
  exampleMessages?: readonly string[];
  suggestionsPlacement?: "above" | "below";
}) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const fillComposer = useCallback((text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  }, []);

  const suggestions = exampleMessages ? (
    <SuggestedActions
      exampleMessages={exampleMessages}
      onSelect={fillComposer}
      hidden={input.length > 0}
    />
  ) : null;

  return (
    <>
      {suggestionsPlacement === "above" && suggestions}
      <MultimodalInput
        type={type}
        input={input}
        setInput={setInput}
        textareaRef={textareaRef}
      />
      {suggestionsPlacement === "below" && suggestions}
    </>
  );
}

const PlaygroundChat = () => {
  useNamespaceChat();
  const namespace = useNamespace();
  const isEmpty = useChatProperty((s) => s.messages.length === 0);
  const template = namespace.demoId ? getDemoTemplate(namespace.demoId) : null;

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
        <ChatComposer
          type="playground"
          exampleMessages={template?.exampleMessages}
        />
      </div>
    </div>
  );
};

const HostingChat = () => {
  const { messages } = useHostingChat();
  const { exampleQuestions, welcomeMessage, logo } = useHosting();
  const isEmpty = messages.length === 0;

  return (
    <div
      className={cn(
        "bg-background flex h-[calc(100dvh-64px)] min-w-0 flex-col",
        isEmpty && "items-center justify-center",
      )}
    >
      {isEmpty ? <Overview title={welcomeMessage} logo={logo} /> : <Messages />}

      <div className="mx-auto flex w-full flex-col gap-4 px-4 pb-4 md:max-w-3xl md:pb-6">
        <ChatComposer
          type="hosted"
          exampleMessages={exampleQuestions}
          suggestionsPlacement="below"
        />
      </div>
    </div>
  );
};
