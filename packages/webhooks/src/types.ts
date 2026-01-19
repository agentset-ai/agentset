import type { z } from "zod";

import type {
  DOCUMENT_LEVEL_WEBHOOK_TRIGGERS,
  INGEST_JOB_LEVEL_WEBHOOK_TRIGGERS,
  WEBHOOK_TRIGGERS,
} from "./constants";
import type {
  documentEventDataSchema,
  documentEventInputSchema,
  ingestJobEventDataSchema,
  ingestJobEventInputSchema,
  webhookEventSchema,
  webhookPayloadSchema,
  WebhookSchema,
} from "./schemas";

// Trigger types
export type WebhookTrigger = (typeof WEBHOOK_TRIGGERS)[number];
export type DocumentWebhookTrigger =
  (typeof DOCUMENT_LEVEL_WEBHOOK_TRIGGERS)[number];
export type IngestJobWebhookTrigger =
  (typeof INGEST_JOB_LEVEL_WEBHOOK_TRIGGERS)[number];

// Webhook payload type (generic envelope)
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

// Webhook configuration type
export type WebhookProps = z.infer<typeof WebhookSchema>;

// Event data types inferred from schemas (serialized format with ISO strings)
export type DocumentEventData = z.infer<typeof documentEventDataSchema>;
export type IngestJobEventData = z.infer<typeof ingestJobEventDataSchema>;

// Full webhook event type (discriminated union for all events)
export type WebhookEvent = z.infer<typeof webhookEventSchema>;

// Union of all event data types (serialized)
export type WebhookEventData = DocumentEventData | IngestJobEventData;

// Input types for emit functions (accepts Date objects from DB)
export type DocumentEventPayload = z.infer<typeof documentEventInputSchema>;
export type IngestJobEventPayload = z.infer<typeof ingestJobEventInputSchema>;

// Generic webhook event data for emit functions
export interface GenericWebhookEventData {
  [key: string]: unknown;
}
