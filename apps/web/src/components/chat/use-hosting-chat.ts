import { useHosting } from "@/contexts/hosting-context";
import { MyUIMessage } from "@/types/ai";
import { DefaultChatTransport } from "ai";
import { useChat } from "ai-sdk-zustand";
import { toast } from "sonner";

export function useHostingChat() {
  const hosting = useHosting();

  return useChat<MyUIMessage>({
    // storeId: "chat",
    transport: new DefaultChatTransport({
      api: `/api/hosting-chat?namespaceId=${hosting.namespaceId}`,
    }),
    onError: () => {
      toast.error("An error occurred, please try again!");
    },
  });
}
