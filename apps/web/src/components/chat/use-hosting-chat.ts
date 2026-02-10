import { useHosting } from "@/contexts/hosting-context";
import { MyUIMessage } from "@/types/ai";
import { DefaultChatTransport } from "ai";
import { useChat } from "ai-sdk-zustand";
import { toast } from "sonner";

export function useHostingChat() {
  const hosting = useHosting();

  return useChat<MyUIMessage>({
    transport: new DefaultChatTransport({
      api: `/api/hosting-chat?namespaceId=${hosting.namespaceId}`,
    }),
    experimental_throttle: 100,
    onError: () => {
      toast.error("An error occurred, please try again!");
    },
  });
}
