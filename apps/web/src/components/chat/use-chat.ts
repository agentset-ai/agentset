import { useNamespace } from "@/hooks/use-namespace";
import { MyUIMessage } from "@/types/ai";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { useChatSettings } from "./chat-settings.store";

export function useNamespaceChat() {
  const namespace = useNamespace();
  const settings = useChatSettings(
    useShallow((s) => s.getNamespace(namespace.id)),
  );

  return useChat<MyUIMessage>({
    id: "chat",
    transport: new DefaultChatTransport({
      api: `/api/chat?namespaceId=${namespace.id}`,
      prepareSendMessagesRequest({ messages, body }) {
        return {
          body: {
            messages,
            ...body,
            topK: settings.topK,
            rerank: true,
            rerankLimit: settings.rerankLimit,
            temperature: settings.temperature,
            includeMetadata: true,
            mode: settings.mode ?? "normal",
            ...(settings.systemPrompt && {
              systemPrompt: settings.systemPrompt,
            }),
          },
        };
      },
    }),
    experimental_throttle: 100,
    onError: () => {
      toast.error("An error occurred, please try again!");
    },
  });
}
