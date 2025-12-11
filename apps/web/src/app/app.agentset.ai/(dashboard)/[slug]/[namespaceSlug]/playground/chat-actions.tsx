"use client";

import { useNamespaceChat } from "@/components/chat/use-chat";
import { logEvent } from "@/lib/analytics";
import {
  aiSdkExample,
  curlExample,
  pythonExample,
  tsSdkExample,
} from "@/lib/code-examples/playground";
import { Code2Icon, PlusIcon, Settings2Icon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui/tooltip";

import ApiDialog from "./api-dialog";
import ChatSettings from "./chat-settings";

export default function ChatActions() {
  const { setMessages } = useNamespaceChat();

  const resetChat = () => {
    logEvent("chat_reset", { type: "playground" });
    setMessages([]);
  };

  return (
    <div className="flex items-center gap-2 pr-5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={resetChat}>
            <PlusIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>New Chat</TooltipContent>
      </Tooltip>

      <Tooltip>
        <ChatSettings
          trigger={
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings2Icon className="size-4" />
              </Button>
            </TooltipTrigger>
          }
        />
        <TooltipContent>Parameters</TooltipContent>
      </Tooltip>

      <Tooltip>
        <ApiDialog
          description="Use the API to query the vector store. You'll need make an API key first."
          tabs={[
            { title: "cURL", language: "bash", code: curlExample },
            { title: "Javascript", language: "typescript", code: tsSdkExample },
            { title: "AI SDK", language: "typescript", code: aiSdkExample },
            { title: "Python", language: "python", code: pythonExample },
          ]}
          trigger={(props) => (
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetChat}
                {...props}
              >
                <Code2Icon className="size-4" />
              </Button>
            </TooltipTrigger>
          )}
        />
        <TooltipContent>API</TooltipContent>
      </Tooltip>
    </div>
  );
}
