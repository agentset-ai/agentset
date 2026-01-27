import { z } from "zod/v4";

import { WEBHOOK_TRIGGERS } from "@agentset/webhooks";

import { tb } from "./client";

// Webhook event schema for the webhook logs
export const webhookEventSchemaTB = z.object({
  event_id: z.string(),
  webhook_id: z.string(),
  task_id: z.string(), // Trigger.dev task ID
  event: z.enum(WEBHOOK_TRIGGERS),
  url: z.string(),
  http_status: z.number(),
  request_body: z.string(),
  response_body: z.string(),
  timestamp: z.string(),
});

export const recordWebhookEvent = tb.buildIngestEndpoint({
  datasource: "agentset_webhook_events",
  event: webhookEventSchemaTB.omit({ timestamp: true }),
});

export const getWebhookEvents = tb.buildPipe({
  pipe: "get_webhook_events",
  parameters: z.object({
    webhookId: z.string(),
  }),
  data: webhookEventSchemaTB,
});
