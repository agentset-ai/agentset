import { useNamespace } from "@/hooks/use-namespace";
import { MyUIMessage } from "@/types/ai";
import { DefaultChatTransport } from "ai";
import { useChat } from "ai-sdk-zustand";
import { toast } from "sonner";

import { useChatSettings } from "./chat-settings.store";

export function useNamespaceChat() {
  const namespace = useNamespace();
  const getNamespace = useChatSettings((s) => s.getNamespace);

  return useChat<MyUIMessage>({
    // storeId: `chat-${namespace.id}`,
    transport: new DefaultChatTransport({
      api: `/api/chat?namespaceId=${namespace.id}`,
      prepareSendMessagesRequest({ messages, body }) {
        const settings = getNamespace(namespace.id);
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
