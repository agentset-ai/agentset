import type {
  DocumentEventPayload,
  DocumentWebhookTrigger,
  IngestJobEventPayload,
  IngestJobWebhookTrigger,
} from "@agentset/webhooks";
import {
  emitBulkDocumentWebhooks as emitBulkDocumentWebhooksBase,
  emitDocumentWebhook as emitDocumentWebhookBase,
  emitIngestJobWebhook as emitIngestJobWebhookBase,
} from "@agentset/webhooks/server";

import { getDb } from "./db";
import { triggerSendWebhook } from "./schema";

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
