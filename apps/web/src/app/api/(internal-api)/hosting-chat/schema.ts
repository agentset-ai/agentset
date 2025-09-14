import { modelMessageSchema } from "ai";
import { z } from "zod/v4";

export const hostingChatSchema = z.object({
  messages: z.array(modelMessageSchema),
});
