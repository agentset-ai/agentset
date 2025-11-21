import { useNamespace } from "@/hooks/use-namespace";
import { MyUIMessage } from "@/types/ai";
import { DefaultChatTransport } from "ai";
import { useChat } from "ai-sdk-zustand";
import { toast } from "sonner";

import { DEFAULT_CHAT_SETTINGS, useChatSettings } from "./chat-settings.store";

export function useNamespaceChat() {
  const namespace = useNamespace();

  return useChat<MyUIMessage>({
    // storeId: `chat-${namespace.id}`,
    transport: new DefaultChatTransport({
      api: `/api/chat?namespaceId=${namespace.id}`,
      prepareSendMessagesRequest({ messages, body }) {
        const settings =
          useChatSettings.getState().namespaces[namespace.id] ??
          DEFAULT_CHAT_SETTINGS;

        return {
          body: {
            messages,
            ...body,
            rerank: true,
            includeMetadata: true,
            topK: settings.topK,
            rerankLimit: settings.rerankLimit,
            rerankModel: settings.rerankModel,
            llmModel: settings.llmModel,
            temperature: settings.temperature,
            mode: settings.mode,
            systemPrompt: settings.systemPrompt ?? undefined,
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
