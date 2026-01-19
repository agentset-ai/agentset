import { z } from "zod/v4";

import { WEBHOOK_TRIGGERS } from "@agentset/utils";

// Schema of the payload sent to the webhook endpoint by Agentset
export const webhookPayloadSchema = z.object({
  id: z.string().describe("Unique identifier for the event."),
  event: z
    .enum(WEBHOOK_TRIGGERS)
    .describe("The type of event that triggered the webhook."),
  createdAt: z
    .string()
    .describe("The date and time when the event was created in UTC."),
  data: z.any().describe("The data associated with the event."),
});

// Schema for creating a webhook
export const createWebhookSchema = z.object({
  name: z.string().min(1).max(40),
  url: z.string().url(),
  secret: z.string().optional(),
  triggers: z.array(z.enum(WEBHOOK_TRIGGERS)).min(1),
  namespaceIds: z.array(z.string()).optional(),
});

// Schema for updating a webhook
export const updateWebhookSchema = createWebhookSchema.partial();

// Webhook response schema for API
export const WebhookSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  secret: z.string(),
  triggers: z.array(z.enum(WEBHOOK_TRIGGERS)),
  disabledAt: z.date().nullable(),
  namespaceIds: z.array(z.string()).optional(),
});
