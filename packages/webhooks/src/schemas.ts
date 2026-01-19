import { z } from "zod";

import {
  DOCUMENT_LEVEL_WEBHOOK_TRIGGERS,
  INGEST_JOB_LEVEL_WEBHOOK_TRIGGERS,
  WEBHOOK_TRIGGERS,
} from "./constants";

// Document event data schema
export const documentEventDataSchema = z.object({
  id: z.string().describe("Unique identifier for the document."),
  name: z.string().nullable().describe("Name of the document."),
  namespaceId: z.string().nullable().describe("ID of the namespace."),
  organizationId: z.string().describe("ID of the organization."),
  status: z.string().describe("Current status of the document."),
  source: z.unknown().describe("Source configuration of the document."),
  totalCharacters: z
    .number()
    .nullable()
    .optional()
    .describe("Total characters in the document."),
  totalChunks: z
    .number()
    .nullable()
    .optional()
    .describe("Total chunks created from the document."),
  totalPages: z
    .number()
    .nullable()
    .optional()
    .describe("Total pages in the document."),
  error: z
    .string()
    .nullable()
    .optional()
    .describe("Error message if document processing failed."),
  createdAt: z.string().describe("When the document was created."),
  updatedAt: z.string().describe("When the document was last updated."),
});

// Ingest job event data schema
export const ingestJobEventDataSchema = z.object({
  id: z.string().describe("Unique identifier for the ingest job."),
  name: z.string().nullable().describe("Name of the ingest job."),
  namespaceId: z.string().describe("ID of the namespace."),
  organizationId: z.string().describe("ID of the organization."),
  status: z.string().describe("Current status of the ingest job."),
  error: z
    .string()
    .nullable()
    .optional()
    .describe("Error message if ingest job failed."),
  createdAt: z.string().describe("When the ingest job was created."),
  updatedAt: z.string().describe("When the ingest job was last updated."),
});

// Input schemas for emit functions (accepts Date objects from DB)
export const documentEventInputSchema = documentEventDataSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ingestJobEventInputSchema = ingestJobEventDataSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});

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

// Helper to create document event schema
const createDocumentEventSchema = (
  event: (typeof DOCUMENT_LEVEL_WEBHOOK_TRIGGERS)[number],
  description: string,
) =>
  z.object({
    id: z.string().describe("Unique identifier for the event."),
    event: z.literal(event),
    createdAt: z.string().describe("When the event was created in UTC."),
    data: documentEventDataSchema,
  });

// Helper to create ingest job event schema
const createIngestJobEventSchema = (
  event: (typeof INGEST_JOB_LEVEL_WEBHOOK_TRIGGERS)[number],
  description: string,
) =>
  z.object({
    id: z.string().describe("Unique identifier for the event."),
    event: z.literal(event),
    createdAt: z.string().describe("When the event was created in UTC."),
    data: ingestJobEventDataSchema,
  });

// Individual document event schemas
export const documentQueuedEventSchema = createDocumentEventSchema(
  "document.queued",
  "Triggered when a document is queued for processing.",
);

export const documentQueuedForResyncEventSchema = createDocumentEventSchema(
  "document.queued_for_resync",
  "Triggered when a document is queued for resyncing.",
);

export const documentQueuedForDeletionEventSchema = createDocumentEventSchema(
  "document.queued_for_deletion",
  "Triggered when a document is queued for deletion.",
);

export const documentProcessingEventSchema = createDocumentEventSchema(
  "document.processing",
  "Triggered when a document starts processing.",
);

export const documentErrorEventSchema = createDocumentEventSchema(
  "document.error",
  "Triggered when a document processing fails.",
);

export const documentReadyEventSchema = createDocumentEventSchema(
  "document.ready",
  "Triggered when a document is ready.",
);

export const documentDeletedEventSchema = createDocumentEventSchema(
  "document.deleted",
  "Triggered when a document is deleted.",
);

// Individual ingest job event schemas
export const ingestJobQueuedEventSchema = createIngestJobEventSchema(
  "ingest_job.queued",
  "Triggered when an ingest job is queued.",
);

export const ingestJobQueuedForResyncEventSchema = createIngestJobEventSchema(
  "ingest_job.queued_for_resync",
  "Triggered when an ingest job is queued for resyncing.",
);

export const ingestJobQueuedForDeletionEventSchema = createIngestJobEventSchema(
  "ingest_job.queued_for_deletion",
  "Triggered when an ingest job is queued for deletion.",
);

export const ingestJobProcessingEventSchema = createIngestJobEventSchema(
  "ingest_job.processing",
  "Triggered when an ingest job starts processing.",
);

export const ingestJobErrorEventSchema = createIngestJobEventSchema(
  "ingest_job.error",
  "Triggered when an ingest job fails.",
);

export const ingestJobReadyEventSchema = createIngestJobEventSchema(
  "ingest_job.ready",
  "Triggered when an ingest job is ready.",
);

export const ingestJobDeletedEventSchema = createIngestJobEventSchema(
  "ingest_job.deleted",
  "Triggered when an ingest job is deleted.",
);

// Discriminated union of all webhook events - useful for OpenAPI spec generation
export const webhookEventSchema = z.discriminatedUnion("event", [
  // Document events
  documentQueuedEventSchema,
  documentQueuedForResyncEventSchema,
  documentQueuedForDeletionEventSchema,
  documentProcessingEventSchema,
  documentErrorEventSchema,
  documentReadyEventSchema,
  documentDeletedEventSchema,
  // Ingest job events
  ingestJobQueuedEventSchema,
  ingestJobQueuedForResyncEventSchema,
  ingestJobQueuedForDeletionEventSchema,
  ingestJobProcessingEventSchema,
  ingestJobErrorEventSchema,
  ingestJobReadyEventSchema,
  ingestJobDeletedEventSchema,
]);

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
