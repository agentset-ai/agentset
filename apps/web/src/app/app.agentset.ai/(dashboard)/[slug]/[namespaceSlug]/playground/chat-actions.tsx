"use client";

import { useNamespaceChat } from "@/components/chat/use-chat";
import { logEvent } from "@/lib/analytics";
import {
  aiSdkExample,
  curlExample,
  tsSdkExample,
} from "@/lib/code-examples/playground";
import { PlusIcon } from "lucide-react";

import { Button } from "@agentset/ui";

import ApiDialog from "./api-dialog";
import ChatSettings from "./chat-settings";

export default function ChatActions() {
  const { setMessages } = useNamespaceChat();

  const resetChat = () => {
    logEvent("chat_reset", { type: "playground" });
    setMessages([]);
  };

  return (
    <div className="flex items-center gap-2 pr-10">
      <Button variant="outline" onClick={resetChat}>
        <PlusIcon className="size-4" />
        New Chat
      </Button>

      <ChatSettings />

      <ApiDialog
        description="Use the API to query the vector store. You'll need make an API key first."
        tabs={[
          { title: "cURL", code: curlExample },
          { title: "Javascript", code: tsSdkExample },
          { title: "AI SDK", code: aiSdkExample },
        ]}
      />
    </div>
  );
}
