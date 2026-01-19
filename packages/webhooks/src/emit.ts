import { nanoid } from "nanoid";
import type { z } from "zod";

import type { db } from "@agentset/db/client";
import type { triggerSendWebhook } from "@agentset/jobs";

import { WEBHOOK_EVENT_ID_PREFIX } from "./constants";
import {
  documentEventDataSchema,
  ingestJobEventDataSchema,
} from "./schemas";
import type {
  DocumentEventPayload,
  DocumentWebhookTrigger,
  GenericWebhookEventData,
  IngestJobEventPayload,
  IngestJobWebhookTrigger,
  WebhookTrigger,
} from "./types";

// Re-export input types for convenience
export type DocumentWebhookInput = DocumentEventPayload;
export type IngestJobWebhookInput = IngestJobEventPayload;

// Transform and validate document event data
export const transformDocumentEventData = (
  document: DocumentEventPayload,
): z.infer<typeof documentEventDataSchema> => {
  return documentEventDataSchema.parse({
    id: document.id,
    name: document.name,
    namespaceId: document.namespaceId,
    organizationId: document.organizationId,
    status: document.status,
    source: document.source,
    totalCharacters: document.totalCharacters,
    totalChunks: document.totalChunks,
    totalPages: document.totalPages,
    error: document.error,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  });
};

// Transform and validate ingest job event data
export const transformIngestJobEventData = (
  ingestJob: IngestJobEventPayload,
): z.infer<typeof ingestJobEventDataSchema> => {
  return ingestJobEventDataSchema.parse({
    id: ingestJob.id,
    name: ingestJob.name,
    namespaceId: ingestJob.namespaceId,
    organizationId: ingestJob.organizationId,
    status: ingestJob.status,
    error: ingestJob.error,
    createdAt: ingestJob.createdAt.toISOString(),
    updatedAt: ingestJob.updatedAt.toISOString(),
  });
};

export interface EmitWebhookParams {
  db: typeof db;
  triggerSendWebhook: typeof triggerSendWebhook;
  trigger: WebhookTrigger;
  organizationId: string;
  namespaceId?: string;
  data: GenericWebhookEventData;
}

// Emit webhook for an organization
export const emitWebhook = async ({
  db,
  triggerSendWebhook,
  trigger,
  organizationId,
  namespaceId,
  data,
}: EmitWebhookParams) => {
  // Check if organization has webhooks enabled
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { webhookEnabled: true },
  });

  if (!org?.webhookEnabled) {
    return;
  }

  // Find webhooks that match this trigger
  const webhooks = await db.webhook.findMany({
    where: {
      organizationId,
      disabledAt: null,
      triggers: {
        array_contains: [trigger],
      },
      // If namespaceId provided, filter to webhooks that either:
      // 1. Have no namespace filters (org-wide)
      // 2. Include the specific namespace
      ...(namespaceId && {
        OR: [
          { namespaces: { none: {} } },
          { namespaces: { some: { namespaceId } } },
        ],
      }),
    },
    select: {
      id: true,
      url: true,
      secret: true,
    },
  });

  if (webhooks.length === 0) {
    return;
  }

  // Prepare webhook payload
  const eventId = `${WEBHOOK_EVENT_ID_PREFIX}${nanoid(25)}`;
  const payload = {
    id: eventId,
    event: trigger,
    createdAt: new Date().toISOString(),
    data,
  };

  // Trigger webhook deliveries
  await Promise.all(
    webhooks.map((webhook) =>
      triggerSendWebhook({
        webhookId: webhook.id,
        eventId,
        event: trigger,
        url: webhook.url,
        secret: webhook.secret,
        payload,
      }),
    ),
  );
};

export interface EmitDocumentWebhookParams {
  db: typeof db;
  triggerSendWebhook: typeof triggerSendWebhook;
  trigger: DocumentWebhookTrigger;
  document: DocumentEventPayload;
}

// Helper to emit document webhook with validation
export const emitDocumentWebhook = async ({
  db,
  triggerSendWebhook,
  trigger,
  document,
}: EmitDocumentWebhookParams) => {
  // Transform and validate the document data
  const data = transformDocumentEventData(document);

  await emitWebhook({
    db,
    triggerSendWebhook,
    trigger,
    organizationId: document.organizationId,
    namespaceId: document.namespaceId ?? undefined,
    data,
  });
};

export interface EmitIngestJobWebhookParams {
  db: typeof db;
  triggerSendWebhook: typeof triggerSendWebhook;
  trigger: IngestJobWebhookTrigger;
  ingestJob: IngestJobEventPayload;
}

// Helper to emit ingest job webhook with validation
export const emitIngestJobWebhook = async ({
  db,
  triggerSendWebhook,
  trigger,
  ingestJob,
}: EmitIngestJobWebhookParams) => {
  // Transform and validate the ingest job data
  const data = transformIngestJobEventData(ingestJob);

  await emitWebhook({
    db,
    triggerSendWebhook,
    trigger,
    organizationId: ingestJob.organizationId,
    namespaceId: ingestJob.namespaceId,
    data,
  });
};
