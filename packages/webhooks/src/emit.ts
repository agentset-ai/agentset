import type { z } from "zod/v4";
import { nanoid } from "nanoid";

import type { PrismaClient } from "@agentset/db";
import type { triggerSendWebhook } from "@agentset/jobs";
import { prefixId } from "@agentset/utils";

import type {
  DocumentEventPayload,
  DocumentWebhookTrigger,
  GenericWebhookEventData,
  IngestJobEventPayload,
  IngestJobWebhookTrigger,
  WebhookTrigger,
} from "./types";
import { WEBHOOK_EVENT_ID_PREFIX } from "./constants";
import { documentEventDataSchema, ingestJobEventDataSchema } from "./schemas";

type TriggerSendWebhookFn = typeof triggerSendWebhook;

export type DocumentWebhookInput = DocumentEventPayload;
export type IngestJobWebhookInput = IngestJobEventPayload;

export const transformDocumentEventData = (
  document: DocumentEventPayload,
): z.infer<typeof documentEventDataSchema> => {
  return documentEventDataSchema.parse({
    id: prefixId(document.id, "doc_"),
    name: document.name,
    namespaceId: document.namespaceId
      ? prefixId(document.namespaceId, "ns_")
      : document.namespaceId,
    organizationId: prefixId(document.organizationId, "org_"),
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

export const transformIngestJobEventData = (
  ingestJob: IngestJobEventPayload,
): z.infer<typeof ingestJobEventDataSchema> => {
  return ingestJobEventDataSchema.parse({
    id: prefixId(ingestJob.id, "job_"),
    name: ingestJob.name,
    namespaceId: prefixId(ingestJob.namespaceId, "ns_"),
    organizationId: prefixId(ingestJob.organizationId, "org_"),
    status: ingestJob.status,
    error: ingestJob.error,
    createdAt: ingestJob.createdAt.toISOString(),
    updatedAt: ingestJob.updatedAt.toISOString(),
  });
};

export interface EmitWebhookParams {
  db: PrismaClient;
  triggerSendWebhook: TriggerSendWebhookFn;
  trigger: WebhookTrigger;
  organizationId: string;
  namespaceId?: string;
  data: GenericWebhookEventData;
}

// Webhook data needed for sending
export interface WebhookForSending {
  id: string;
  url: string;
  secret: string;
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
  // Single query: fetch webhooks with org webhookEnabled check at DB level
  const webhooks = await db.webhook.findMany({
    where: {
      organizationId,
      organization: { webhookEnabled: true }, // Filter at DB level
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

// Send webhooks with pre-fetched webhook list (for bulk operations)
export const sendWebhooksWithCache = async ({
  triggerSendWebhook,
  trigger,
  webhooks,
  data,
}: {
  triggerSendWebhook: TriggerSendWebhookFn;
  trigger: WebhookTrigger;
  webhooks: WebhookForSending[];
  data: GenericWebhookEventData;
}) => {
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

// Get active webhooks for an organization and trigger (for bulk operations)
export const getActiveWebhooks = async ({
  db,
  organizationId,
  trigger,
  namespaceId,
}: {
  db: PrismaClient;
  organizationId: string;
  trigger: WebhookTrigger;
  namespaceId?: string;
}): Promise<WebhookForSending[]> => {
  return db.webhook.findMany({
    where: {
      organizationId,
      organization: { webhookEnabled: true },
      disabledAt: null,
      triggers: {
        array_contains: [trigger],
      },
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
};

export interface EmitDocumentWebhookParams {
  db: PrismaClient;
  triggerSendWebhook: TriggerSendWebhookFn;
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

export interface EmitBulkDocumentWebhooksParams {
  db: PrismaClient;
  triggerSendWebhook: TriggerSendWebhookFn;
  trigger: DocumentWebhookTrigger;
  documents: DocumentEventPayload[];
  organizationId: string;
  namespaceId?: string;
}

/**
 * Emit webhooks for multiple documents in bulk.
 * Fetches webhooks once and sends to all matching documents.
 */
export const emitBulkDocumentWebhooks = async ({
  db,
  triggerSendWebhook,
  trigger,
  documents,
  organizationId,
  namespaceId,
}: EmitBulkDocumentWebhooksParams) => {
  if (documents.length === 0) {
    return;
  }

  // Fetch webhooks once for all documents
  const webhooks = await getActiveWebhooks({
    db,
    organizationId,
    trigger,
    namespaceId,
  });

  if (webhooks.length === 0) {
    return;
  }

  // Send webhooks for each document using the cached webhook list
  await Promise.all(
    documents.map((document) => {
      const data = transformDocumentEventData(document);
      return sendWebhooksWithCache({
        triggerSendWebhook,
        trigger,
        webhooks,
        data,
      });
    }),
  );
};

export interface EmitIngestJobWebhookParams {
  db: PrismaClient;
  triggerSendWebhook: TriggerSendWebhookFn;
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
