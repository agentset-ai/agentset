import { useHosting } from "@/contexts/hosting-context";
import { MyUIMessage } from "@/types/ai";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";

export function useHostingChat() {
  const hosting = useHosting();

  return useChat<MyUIMessage>({
    id: "chat",
    transport: new DefaultChatTransport({
      api: `/api/hosting-chat?namespaceId=${hosting.namespaceId}`,
    }),
    onError: () => {
      toast.error("An error occurred, please try again!");
    },
  });
}
