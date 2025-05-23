"use client";

import { useNamespaceChat } from "@/components/chat/use-chat";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

import ApiDialog from "./api-dialog";
import ChatSettings from "./chat-settings";

export default function ChatActions() {
  const { setMessages } = useNamespaceChat();

  const resetChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex items-center gap-2 pr-10">
      <Button variant="outline" onClick={resetChat}>
        <PlusIcon className="size-4" />
        New Chat
      </Button>

      <ChatSettings />

      <ApiDialog />
    </div>
  );
}
