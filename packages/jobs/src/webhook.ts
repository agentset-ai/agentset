import type {
  DocumentEventPayload,
  DocumentWebhookTrigger,
  GenericWebhookEventData,
  IngestJobEventPayload,
  IngestJobWebhookTrigger,
  WebhookTrigger,
} from "@agentset/webhooks";
import {
  emitBulkDocumentWebhooks as emitBulkDocumentWebhooksBase,
  emitDocumentWebhook as emitDocumentWebhookBase,
  emitIngestJobWebhook as emitIngestJobWebhookBase,
  emitWebhook as emitWebhookBase,
} from "@agentset/webhooks";

import { getDb } from "./db";
import { triggerSendWebhook } from "./schema";

// Emit webhook for an organization (jobs context)
export const emitWebhook = async ({
  trigger,
  organizationId,
  namespaceId,
  data,
}: {
  trigger: WebhookTrigger;
  organizationId: string;
  namespaceId?: string;
  data: GenericWebhookEventData;
}) => {
  const db = getDb();
  return emitWebhookBase({
    db,
    triggerSendWebhook,
    trigger,
    organizationId,
    namespaceId,
    data,
  });
};

// Helper to emit document webhook (jobs context)
export const emitDocumentWebhook = async ({
  trigger,
  document,
}: {
  trigger: DocumentWebhookTrigger;
  document: DocumentEventPayload;
}) => {
  const db = getDb();
  return emitDocumentWebhookBase({
    db,
    triggerSendWebhook,
    trigger,
    document,
  });
};

// Helper to emit ingest job webhook (jobs context)
export const emitIngestJobWebhook = async ({
  trigger,
  ingestJob,
}: {
  trigger: IngestJobWebhookTrigger;
  ingestJob: IngestJobEventPayload;
}) => {
  const db = getDb();
  return emitIngestJobWebhookBase({
    db,
    triggerSendWebhook,
    trigger,
    ingestJob,
  });
};

/**
 * Emit webhooks for multiple documents in bulk (jobs context).
 * Fetches webhooks once and sends to all matching documents.
 */
export const emitBulkDocumentWebhooks = async ({
  trigger,
  documents,
  organizationId,
  namespaceId,
}: {
  trigger: DocumentWebhookTrigger;
  documents: DocumentEventPayload[];
  organizationId: string;
  namespaceId?: string;
}) => {
  const db = getDb();
  return emitBulkDocumentWebhooksBase({
    db,
    triggerSendWebhook,
    trigger,
    documents,
    organizationId,
    namespaceId,
  });
};
