import { messagesSchema } from "@/schemas/chat";
import { z } from "zod/v4";

export const hostingChatSchema = z.object({
  messages: messagesSchema,
});
