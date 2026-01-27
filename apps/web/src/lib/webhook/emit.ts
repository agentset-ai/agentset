import type {
  DocumentEventPayload,
  DocumentWebhookTrigger,
  IngestJobEventPayload,
  IngestJobWebhookTrigger,
} from "@agentset/webhooks";
import { db } from "@agentset/db/client";
import { triggerSendWebhook } from "@agentset/jobs";
import {
  emitDocumentWebhook as emitDocumentWebhookBase,
  emitIngestJobWebhook as emitIngestJobWebhookBase,
} from "@agentset/webhooks/server";

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
