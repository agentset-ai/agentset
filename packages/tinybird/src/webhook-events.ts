import { z } from "zod/v4";

import { WEBHOOK_TRIGGERS } from "@agentset/webhooks";

import { isTinybirdEnabled, tb } from "./client";

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

const ingestWebhookEvent = tb.buildIngestEndpoint({
  datasource: "agentset_webhook_events",
  event: webhookEventSchemaTB.omit({ timestamp: true }),
});

const queryWebhookEvents = tb.buildPipe({
  pipe: "get_webhook_events",
  parameters: z.object({
    webhookId: z.string(),
  }),
  data: webhookEventSchemaTB,
});

// Guards direct calls too, so nothing reaches Tinybird while logs are off
const assertTinybirdEnabled = () => {
  if (!isTinybirdEnabled) {
    throw new Error("Webhook delivery logs are disabled");
  }
};

export const recordWebhookEvent: typeof ingestWebhookEvent = async (events) => {
  assertTinybirdEnabled();
  return ingestWebhookEvent(events);
};

export const getWebhookEvents: typeof queryWebhookEvents = async (params) => {
  assertTinybirdEnabled();
  return queryWebhookEvents(params);
};
