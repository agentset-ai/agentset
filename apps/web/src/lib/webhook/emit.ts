import { db } from "@agentset/db/client";
import { triggerSendWebhook } from "@agentset/jobs";
import {
  emitDocumentWebhook as emitDocumentWebhookBase,
  emitIngestJobWebhook as emitIngestJobWebhookBase,
  emitWebhook as emitWebhookBase,
  type DocumentEventPayload,
  type DocumentWebhookTrigger,
  type GenericWebhookEventData,
  type IngestJobEventPayload,
  type IngestJobWebhookTrigger,
  type WebhookTrigger,
} from "@agentset/webhooks";

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
