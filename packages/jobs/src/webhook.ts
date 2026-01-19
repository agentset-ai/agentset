import { WEBHOOK_EVENT_ID_PREFIX, WEBHOOK_TRIGGERS } from "@agentset/utils";
import { nanoid } from "nanoid";

import { getDb } from "./db";
import { triggerSendWebhook } from "./schema";

type WebhookTrigger = (typeof WEBHOOK_TRIGGERS)[number];

interface WebhookEventData {
  [key: string]: unknown;
}

// Emit webhook for an organization
export const emitWebhook = async ({
  trigger,
  organizationId,
  namespaceId,
  data,
}: {
  trigger: WebhookTrigger;
  organizationId: string;
  namespaceId?: string;
  data: WebhookEventData;
}) => {
  const db = getDb();

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

// Helper to emit document webhook
export const emitDocumentWebhook = async ({
  trigger,
  document,
}: {
  trigger: Extract<
    WebhookTrigger,
    | "document.queued"
    | "document.queued_for_resync"
    | "document.queued_for_deletion"
    | "document.processing"
    | "document.error"
    | "document.ready"
    | "document.deleted"
  >;
  document: {
    id: string;
    name: string;
    namespaceId: string;
    organizationId: string;
    status: string;
    source: unknown;
    totalCharacters?: number | null;
    totalChunks?: number | null;
    totalPages?: number | null;
    error?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}) => {
  await emitWebhook({
    trigger,
    organizationId: document.organizationId,
    namespaceId: document.namespaceId,
    data: {
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
    },
  });
};

// Helper to emit ingest job webhook
export const emitIngestJobWebhook = async ({
  trigger,
  ingestJob,
}: {
  trigger: Extract<
    WebhookTrigger,
    | "ingest_job.queued"
    | "ingest_job.queued_for_resync"
    | "ingest_job.queued_for_deletion"
    | "ingest_job.processing"
    | "ingest_job.error"
    | "ingest_job.ready"
    | "ingest_job.deleted"
  >;
  ingestJob: {
    id: string;
    name: string | null;
    namespaceId: string;
    organizationId: string;
    status: string;
    error?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}) => {
  await emitWebhook({
    trigger,
    organizationId: ingestJob.organizationId,
    namespaceId: ingestJob.namespaceId,
    data: {
      id: ingestJob.id,
      name: ingestJob.name,
      namespaceId: ingestJob.namespaceId,
      organizationId: ingestJob.organizationId,
      status: ingestJob.status,
      error: ingestJob.error,
      createdAt: ingestJob.createdAt.toISOString(),
      updatedAt: ingestJob.updatedAt.toISOString(),
    },
  });
};
