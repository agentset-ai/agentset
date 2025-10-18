"use client";

import { useNamespaceChat } from "@/components/chat/use-chat";
import { logEvent } from "@/lib/analytics";
import {
  aiSdkExample,
  curlExample,
  tsSdkExample,
} from "@/lib/code-examples/playground";
import { Code2Icon, PlusIcon, Settings2Icon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui";
import { Action } from "@agentset/ui/components/ai-elements/actions";

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
          <Action onClick={resetChat}>
            <PlusIcon className="size-4" />
          </Action>
        </TooltipTrigger>
        <TooltipContent>New Chat</TooltipContent>
      </Tooltip>

      <Tooltip>
        <ChatSettings
          trigger={
            <TooltipTrigger asChild>
              <Action onClick={resetChat}>
                <Settings2Icon className="size-4" />
              </Action>
            </TooltipTrigger>
          }
        />
        <TooltipContent>Parameters</TooltipContent>
      </Tooltip>

      <Tooltip>
        <ApiDialog
          description="Use the API to query the vector store. You'll need make an API key first."
          tabs={[
            { title: "cURL", code: curlExample },
            { title: "Javascript", code: tsSdkExample },
            { title: "AI SDK", code: aiSdkExample },
          ]}
          trigger={
            <TooltipTrigger asChild>
              <Action>
                <Code2Icon className="size-4" />
              </Action>
            </TooltipTrigger>
          }
        />
        <TooltipContent>API</TooltipContent>
      </Tooltip>
    </div>
  );
}
