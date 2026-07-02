import { z } from "zod/v4";

export const webhookIdPathSchema = z.string().meta({
  examples: ["wh_123"],
  description: "The id of the webhook (prefixed with wh_)",
  param: {
    in: "path",
    name: "webhookId",
    id: "WebhookIdRef",
  },
});
