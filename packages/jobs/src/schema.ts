import type { BatchItem } from "@trigger.dev/sdk";
import { tasks } from "@trigger.dev/sdk";
import { z } from "zod/v4";

import { isEnterprisePlan, isProPlan } from "@agentset/stripe/plans";
import { EU_TRIGGER_REGION, isEuRegion } from "@agentset/utils";
import {
  configSchema,
  EmbeddingConfigSchema,
  VectorStoreSchema,
} from "@agentset/validation";
import { WEBHOOK_TRIGGERS } from "@agentset/webhooks";
import { storeWebhookEventPayload } from "@agentset/webhooks/event-store";

const getPriorityByPlan = (plan: string) => {
  if (isEnterprisePlan(plan)) return;
  if (isProPlan(plan)) return 3600 * 24; // 24 hours
  return 3600 * 16; // 16 hours
};

// Spread into every trigger's options: EU runs execute on EU workers
export const triggerRegionOptions: { region?: string } = isEuRegion
  ? { region: EU_TRIGGER_REGION }
  : {};

export const TRIGGER_INGESTION_JOB_ID = "trigger-ingestion-job";
export const triggerIngestionJobBodySchema = z.object({
  jobId: z.string(),
  organizationId: z.string(),
});

export const triggerIngestionJob = (
  body: z.infer<typeof triggerIngestionJobBodySchema>,
  plan: string,
) =>
  tasks.trigger(TRIGGER_INGESTION_JOB_ID, body, {
    tags: [`job_${body.jobId}`],
    priority: getPriorityByPlan(plan),
    ...triggerRegionOptions,
  });

export const SEED_DEMO_NAMESPACE_JOB_ID = "seed-demo-namespace";
export const seedDemoNamespaceBodySchema = z.object({
  namespaceId: z.string(),
  organizationId: z.string(),
  templateId: z.string(),
});
export const triggerSeedDemoNamespace = (
  body: z.infer<typeof seedDemoNamespaceBodySchema>,
  plan: string,
) =>
  tasks.trigger(SEED_DEMO_NAMESPACE_JOB_ID, body, {
    tags: [
      `ns_${body.namespaceId}`,
      `org_${body.organizationId}`,
      `template_${body.templateId}`,
    ],
    priority: getPriorityByPlan(plan),
    idempotencyKey: `seed_demo_${body.namespaceId}`,
    ...triggerRegionOptions,
  });

export const TRIGGER_DOCUMENT_JOB_ID = "trigger-document-job";
export const documentJobIngestJobSchema = z.object({
  id: z.string(),
  config: configSchema.nullable(),
  namespace: z.object({
    id: z.string(),
    embeddingConfig: EmbeddingConfigSchema.nullable(),
    vectorStoreConfig: VectorStoreSchema.nullable(),
    organization: z.object({
      id: z.string(),
      plan: z.string(),
      stripeId: z.string().optional().nullable(),
    }),
  }),
});
const documentJobInlineBodySchema = z.object({
  documentId: z.string(),
  ingestJob: documentJobIngestJobSchema,
  cleanup: z.boolean().optional(),
});
// EU also accepts IDs only; the task loads the ingest job from the database
export const triggerDocumentJobBodySchema = isEuRegion
  ? z.union([
      documentJobInlineBodySchema,
      z.object({
        documentId: z.string(),
        ingestJobId: z.string(),
        cleanup: z.boolean().optional(),
      }),
    ])
  : documentJobInlineBodySchema;

export const getDocumentJobPayload = ({
  documentId,
  ingestJob,
  cleanup,
}: {
  documentId: string;
  ingestJob: z.input<typeof documentJobIngestJobSchema>;
  cleanup?: boolean;
}): z.input<typeof triggerDocumentJobBodySchema> =>
  isEuRegion
    ? { documentId, ingestJobId: ingestJob.id, ...(cleanup && { cleanup }) }
    : { documentId, ingestJob, ...(cleanup && { cleanup }) };

export const DELETE_DOCUMENT_JOB_ID = "delete-document-job";
export const deleteDocumentBodySchema = z.object({
  documentId: z.string(),
  skipWebhooks: z.boolean().optional(),
  // set for standalone deletes; when deleting a whole ingest job / namespace,
  // the parent task aggregates and updates the counters itself
  updateCounters: z.boolean().optional(),
});
export const triggerDeleteDocument = (
  body: z.infer<typeof deleteDocumentBodySchema>,
) =>
  tasks.trigger(DELETE_DOCUMENT_JOB_ID, body, {
    tags: [`doc_${body.documentId}`],
    ...triggerRegionOptions,
  });

export const DELETE_INGEST_JOB_ID = "delete-ingest-job";
export const deleteIngestJobBodySchema = z.object({
  jobId: z.string(),
  skipWebhooks: z.boolean().optional(),
});
export const triggerDeleteIngestJob = (
  body: z.infer<typeof deleteIngestJobBodySchema>,
) =>
  tasks.trigger(DELETE_INGEST_JOB_ID, body, {
    tags: [`job_${body.jobId}`],
    ...triggerRegionOptions,
  });

export const DELETE_NAMESPACE_JOB_ID = "delete-namespace-job";
export const deleteNamespaceBodySchema = z.object({
  namespaceId: z.string(),
});
export const triggerDeleteNamespace = (
  body: z.infer<typeof deleteNamespaceBodySchema>,
) =>
  tasks.trigger(DELETE_NAMESPACE_JOB_ID, body, {
    tags: [`ns_${body.namespaceId}`],
    ...triggerRegionOptions,
  });

export const DELETE_ORGANIZATION_JOB_ID = "delete-organization-job";
export const deleteOrganizationBodySchema = z.object({
  organizationId: z.string(),
});
export const triggerDeleteOrganization = (
  body: z.infer<typeof deleteOrganizationBodySchema>,
) =>
  tasks.trigger(DELETE_ORGANIZATION_JOB_ID, body, {
    tags: [`org_${body.organizationId}`],
    ...triggerRegionOptions,
  });

export const METER_ORG_DOCUMENTS_JOB_ID = "meter-org-documents-job";
export const meterOrgDocumentsBodySchema = z.object({
  organizationId: z.string(),
});
export const triggerMeterOrgDocuments = (
  body: z.infer<typeof meterOrgDocumentsBodySchema>,
) =>
  tasks.trigger(METER_ORG_DOCUMENTS_JOB_ID, body, {
    tags: [`org_${body.organizationId}`],
    ...triggerRegionOptions,
  });

export const triggerMeterOrgDocumentsBatch = (
  body: z.infer<typeof meterOrgDocumentsBodySchema>[],
) =>
  tasks.batchTrigger(
    METER_ORG_DOCUMENTS_JOB_ID,
    body.map((b) => ({
      payload: b,
      options: {
        tags: [`org_${b.organizationId}`],
        ...triggerRegionOptions,
      },
    })) satisfies BatchItem<z.infer<typeof meterOrgDocumentsBodySchema>>[],
  );

export const RE_INGEST_JOB_ID = "re-ingest-job";
export const reIngestJobBodySchema = z.object({
  jobId: z.string(),
});
export const triggerReIngestJob = (
  body: z.infer<typeof reIngestJobBodySchema>,
  plan: string,
) =>
  tasks.trigger(RE_INGEST_JOB_ID, body, {
    tags: [`job_${body.jobId}`],
    priority: getPriorityByPlan(plan),
    ...triggerRegionOptions,
  });

export const SEND_WEBHOOK_JOB_ID = "send-webhook";
export const sendWebhookInlineBodySchema = z.object({
  webhookId: z.string(),
  eventId: z.string(),
  event: z.enum(WEBHOOK_TRIGGERS),
  url: z.string(),
  secret: z.string(),
  payload: z.any(),
});
// EU also accepts IDs only; the task loads the webhook from the database and
// the event payload from Redis
export const sendWebhookBodySchema = isEuRegion
  ? z.union([
      sendWebhookInlineBodySchema,
      z
        .object({
          webhookId: z.string(),
          eventId: z.string(),
        })
        .strict(),
    ])
  : sendWebhookInlineBodySchema;

type SendWebhookInlineBody = z.infer<typeof sendWebhookInlineBodySchema>;

export const getSendWebhookPayload = (
  body: SendWebhookInlineBody,
): z.infer<typeof sendWebhookBodySchema> =>
  isEuRegion ? { webhookId: body.webhookId, eventId: body.eventId } : body;

const storeWebhookEventPayloads = async (bodies: SendWebhookInlineBody[]) => {
  const payloads = new Map(bodies.map((b) => [b.eventId, b.payload]));
  await Promise.all(
    [...payloads].map(([eventId, payload]) =>
      storeWebhookEventPayload(eventId, payload),
    ),
  );
};

export const triggerSendWebhook = async (
  body: SendWebhookInlineBody | SendWebhookInlineBody[],
) => {
  if (isEuRegion) {
    await storeWebhookEventPayloads(Array.isArray(body) ? body : [body]);
  }

  if (Array.isArray(body) && body.length > 1) {
    return tasks.batchTrigger(
      SEND_WEBHOOK_JOB_ID,
      body.map((b) => ({
        payload: getSendWebhookPayload(b),
        options: {
          tags: [`webhook_${b.webhookId}`, `event_${b.eventId}`],
          idempotencyKey: b.eventId,
          ...triggerRegionOptions,
        },
      })),
    );
  }

  const item = Array.isArray(body) ? body[0]! : body;
  return tasks.trigger(SEND_WEBHOOK_JOB_ID, getSendWebhookPayload(item), {
    tags: [`webhook_${item.webhookId}`, `event_${item.eventId}`],
    idempotencyKey: item.eventId,
    ...triggerRegionOptions,
  });
};
