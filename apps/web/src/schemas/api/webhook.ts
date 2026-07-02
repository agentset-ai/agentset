import { z } from "zod/v4";

import { WEBHOOK_TRIGGERS } from "@agentset/webhooks";

export const WebhookSchema = z
  .object({
    id: z
      .string()
      .describe("The unique ID of the webhook (prefixed with wh_)."),
    name: z.string().describe("The name of the webhook."),
    url: z.string().describe("The URL webhook events are sent to."),
    secret: z
      .string()
      .describe(
        "The secret used to sign webhook payloads (prefixed with whsec_).",
      ),
    triggers: z
      .array(z.enum(WEBHOOK_TRIGGERS))
      .describe("The events that trigger the webhook."),
    disabledAt: z
      .date()
      .nullable()
      .describe(
        "The date and time the webhook was disabled. Null when the webhook is enabled.",
      ),
    namespaceIds: z
      .array(z.string())
      .describe(
        "The IDs of the namespaces the webhook is scoped to. An empty array means the webhook applies to all namespaces in the organization.",
      ),
  })
  .meta({
    id: "webhook",
    title: "Webhook",
  });

export const WebhookSummarySchema = WebhookSchema.omit({
  secret: true,
}).meta({
  id: "webhook-summary",
  title: "Webhook Summary",
});

export const WebhookDetailsSchema = WebhookSchema.extend({
  consecutiveFailures: z
    .number()
    .describe("The number of consecutive failed deliveries."),
  lastFailedAt: z
    .date()
    .nullable()
    .describe("The date and time of the last failed delivery."),
  createdAt: z.date().describe("The date and time the webhook was created."),
}).meta({
  id: "webhook-details",
  title: "Webhook Details",
});

export const createWebhookSchema = z.object({
  name: z.string().min(1).max(40).describe("The name of the webhook."),
  url: z.url().describe("The URL webhook events are sent to."),
  secret: z
    .string()
    .optional()
    .describe(
      "A custom secret used to sign webhook payloads. Generated automatically when omitted.",
    ),
  triggers: z
    .array(z.enum(WEBHOOK_TRIGGERS))
    .min(1)
    .describe("The events that trigger the webhook."),
  namespaceIds: z
    .array(z.string())
    .optional()
    .describe(
      "The IDs of the namespaces to scope the webhook to (prefixed with ns_). When omitted or empty, the webhook applies to all namespaces in the organization.",
    ),
});

export const updateWebhookSchema = createWebhookSchema
  .omit({ secret: true })
  .partial()
  .extend({
    enabled: z
      .boolean()
      .optional()
      .describe(
        "Enable or disable the webhook. Re-enabling a disabled webhook resets its failure count.",
      ),
  })
  .refine(
    (body) =>
      Object.keys(body).some(
        (key) => body[key as keyof typeof body] !== undefined,
      ),
    {
      message: "At least one field must be provided.",
    },
  );
