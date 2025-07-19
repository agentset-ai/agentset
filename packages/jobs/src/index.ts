// Task payload type definitions for Trigger.dev workflows
import { z } from "zod";

export const TRIGGER_INGESTION_JOB_ID = "trigger-ingestion-job";
export const triggerIngestionJobBodySchema = z.object({
  jobId: z.string(),
});
export type TriggerIngestionJobBody = z.infer<
  typeof triggerIngestionJobBodySchema
>;

export const TRIGGER_DOCUMENT_JOB_ID = "trigger-document-job";
export const triggerDocumentJobBodySchema = z.object({
  documentId: z.string(),
  cleanup: z.boolean().optional(),
});
export type TriggerDocumentJobBody = z.infer<
  typeof triggerDocumentJobBodySchema
>;

export const DELETE_DOCUMENT_JOB_ID = "delete-document-job";
export const deleteDocumentBodySchema = z.object({
  documentId: z.string(),
});
export type DeleteDocumentBody = z.infer<typeof deleteDocumentBodySchema>;

export const DELETE_INGEST_JOB_ID = "delete-ingest-job";
export const deleteIngestJobBodySchema = z.object({
  jobId: z.string(),
});
export type DeleteIngestJobBody = z.infer<typeof deleteIngestJobBodySchema>;

export const DELETE_NAMESPACE_JOB_ID = "delete-namespace-job";
export const deleteNamespaceBodySchema = z.object({
  namespaceId: z.string(),
});
export type DeleteNamespaceBody = z.infer<typeof deleteNamespaceBodySchema>;

export const DELETE_ORGANIZATION_JOB_ID = "delete-organization-job";
export const deleteOrganizationBodySchema = z.object({
  organizationId: z.string(),
});
export type DeleteOrganizationBody = z.infer<
  typeof deleteOrganizationBodySchema
>;

export const METER_ORG_DOCUMENTS_JOB_ID = "meter-org-documents-job";
export const meterOrgDocumentsBodySchema = z.object({
  organizationId: z.string(),
});
export type MeterOrgDocumentsBody = z.infer<typeof meterOrgDocumentsBodySchema>;

export const RE_INGEST_JOB_ID = "re-ingest-job";
export const reIngestJobBodySchema = z.object({
  jobId: z.string(),
});
export type ReIngestJobBody = z.infer<typeof reIngestJobBodySchema>;
