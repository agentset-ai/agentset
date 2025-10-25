import type { BatchItem } from "@trigger.dev/sdk";
import { tasks } from "@trigger.dev/sdk";
import { z } from "zod/v4";

import { isEnterprisePlan, isProPlan } from "@agentset/stripe/plans";
import {
  configSchema,
  EmbeddingConfigSchema,
  VectorStoreSchema,
} from "@agentset/validation";

const getPriorityByPlan = (plan: string) => {
  if (isEnterprisePlan(plan)) return;
  if (isProPlan(plan)) return 3600 * 24; // 24 hours
  return 3600 * 16; // 16 hours
};

export const TRIGGER_INGESTION_JOB_ID = "trigger-ingestion-job";
export const triggerIngestionJobBodySchema = z.object({
  jobId: z.string(),
});
export const triggerIngestionJob = (
  body: z.infer<typeof triggerIngestionJobBodySchema>,
  plan: string,
) =>
  tasks.trigger(TRIGGER_INGESTION_JOB_ID, body, {
    tags: [`job_${body.jobId}`],
    priority: getPriorityByPlan(plan),
  });

export const TRIGGER_DOCUMENT_JOB_ID = "trigger-document-job";
export const triggerDocumentJobBodySchema = z.object({
  documentId: z.string(),
  ingestJob: z.object({
    id: z.string(),
    config: configSchema.nullable(),
    namespace: z.object({
      id: z.string(),
      keywordEnabled: z.boolean(),
      embeddingConfig: EmbeddingConfigSchema.nullable(),
      vectorStoreConfig: VectorStoreSchema.nullable(),
      organization: z.object({
        plan: z.string(),
        stripeId: z.string().optional().nullable(),
      }),
    }),
  }),
  cleanup: z.boolean().optional(),
});

export const DELETE_DOCUMENT_JOB_ID = "delete-document-job";
export const deleteDocumentBodySchema = z.object({
  documentId: z.string(),
});
export const triggerDeleteDocument = (
  body: z.infer<typeof deleteDocumentBodySchema>,
) =>
  tasks.trigger(DELETE_DOCUMENT_JOB_ID, body, {
    tags: [`doc_${body.documentId}`],
  });

export const DELETE_INGEST_JOB_ID = "delete-ingest-job";
export const deleteIngestJobBodySchema = z.object({
  jobId: z.string(),
});
export const triggerDeleteIngestJob = (
  body: z.infer<typeof deleteIngestJobBodySchema>,
) => tasks.trigger(DELETE_INGEST_JOB_ID, body, { tags: [`job_${body.jobId}`] });

export const DELETE_NAMESPACE_JOB_ID = "delete-namespace-job";
export const deleteNamespaceBodySchema = z.object({
  namespaceId: z.string(),
});
export const triggerDeleteNamespace = (
  body: z.infer<typeof deleteNamespaceBodySchema>,
) =>
  tasks.trigger(DELETE_NAMESPACE_JOB_ID, body, {
    tags: [`ns_${body.namespaceId}`],
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
  });
