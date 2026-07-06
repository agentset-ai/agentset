import type { chatMessageSchema } from "@/schemas/api/chat";
import type { ModelMessage } from "ai";
import type { z } from "zod/v4";

/**
 * Maps public-API chat messages to AI SDK `ModelMessage`s. Shared by the
 * REST chat route and the MCP chat tool.
 */
export const toModelMessages = (
  messages: z.infer<typeof chatMessageSchema>[],
): ModelMessage[] =>
  messages.map((message) =>
    message.role === "user"
      ? { role: "user", content: message.content }
      : { role: "assistant", content: message.content },
  );
