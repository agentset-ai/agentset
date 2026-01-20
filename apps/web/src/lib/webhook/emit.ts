import { db } from "@agentset/db/client";
import { triggerSendWebhook } from "@agentset/jobs";
import type {
  DocumentEventPayload,
  DocumentWebhookTrigger,
  GenericWebhookEventData,
  IngestJobEventPayload,
  IngestJobWebhookTrigger,
  WebhookTrigger,
} from "@agentset/webhooks";
import {
  emitDocumentWebhook as emitDocumentWebhookBase,
  emitIngestJobWebhook as emitIngestJobWebhookBase,
  emitWebhook as emitWebhookBase,
} from "@agentset/webhooks/server";

// Emit webhook for an organization (web app context)
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
  return emitWebhookBase({
    db,
    triggerSendWebhook,
    trigger,
    organizationId,
    namespaceId,
    data,
  });
};

// Helper to emit document webhook (web app context)
export const emitDocumentWebhook = async ({
  trigger,
  document,
}: {
  trigger: DocumentWebhookTrigger;
  document: DocumentEventPayload;
}) => {
  return emitDocumentWebhookBase({
    db,
    triggerSendWebhook,
    trigger,
    document,
  });
};

// Helper to emit ingest job webhook (web app context)
export const emitIngestJobWebhook = async ({
  trigger,
  ingestJob,
}: {
  trigger: IngestJobWebhookTrigger;
  ingestJob: IngestJobEventPayload;
}) => {
  return emitIngestJobWebhookBase({
    db,
    triggerSendWebhook,
    trigger,
    ingestJob,
  });
};
