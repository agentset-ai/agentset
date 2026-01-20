import { z } from "zod/v4";

import { DocumentStatusSchema, IngestJobStatusSchema } from "@agentset/db";
import { documentPayloadSchema } from "@agentset/validation";

import {
  DOCUMENT_LEVEL_WEBHOOK_TRIGGERS,
  INGEST_JOB_LEVEL_WEBHOOK_TRIGGERS,
  WEBHOOK_TRIGGERS,
} from "./constants";

// Document event data schema
export const documentEventDataSchema = z.object({
  id: z.string().describe("Unique identifier for the document."),
  name: z.string().nullable().describe("Name of the document."),
  namespaceId: z.string().describe("ID of the namespace."),
  organizationId: z.string().describe("ID of the organization."),
  status: DocumentStatusSchema.describe("Current status of the document."),
  source: documentPayloadSchema.describe(
    "Source configuration of the document.",
  ),
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
  status: IngestJobStatusSchema.describe("Current status of the ingest job."),
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

export const webhookEventSchema = z
  .union([
    z
      .object({
        id: z.string(),
        event: z.union(
          DOCUMENT_LEVEL_WEBHOOK_TRIGGERS.map((trigger) => z.literal(trigger)),
        ),
        createdAt: z.string(),
        data: documentEventDataSchema,
      })
      .meta({
        description:
          "Triggered when a document is queued, processed, ready, or deleted.",
        id: "DocumentWebhookEvent",
        outputId: "DocumentWebhookEvent",
      }),
    z
      .object({
        id: z.string(),
        event: z.union(
          INGEST_JOB_LEVEL_WEBHOOK_TRIGGERS.map((trigger) =>
            z.literal(trigger),
          ),
        ),
        createdAt: z.string(),
        data: ingestJobEventDataSchema,
      })
      .meta({
        description:
          "Triggered when an ingest job is queued, processed, ready, or deleted.",
        id: "IngestJobWebhookEvent",
        outputId: "IngestJobWebhookEvent",
      }),
  ])
  .meta({
    description: "Webhook event schema",
    "x-speakeasy-include": true,
    id: "WebhookEvent",
  });

// Schema for creating a webhook
export const createWebhookSchema = z.object({
  name: z.string().min(1).max(40),
  url: z.url(),
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
