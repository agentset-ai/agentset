import { env } from "@/env";
import { Client as QstashClient, Receiver } from "@upstash/qstash";
import { Client as WorkflowClient } from "@upstash/workflow";

import { getBaseUrl } from "./utils";

export const qstashClient = new QstashClient({
  baseUrl: env.QSTASH_URL,
  token: env.QSTASH_TOKEN,
});

const workflowClient = new WorkflowClient({
  baseUrl: env.QSTASH_URL,
  token: env.QSTASH_TOKEN,
});

export const qstashReceiver = new Receiver({
  currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
});

export type TriggerIngestionJobBody = {
  jobId: string;
};
export const triggerIngestionJob = async (body: TriggerIngestionJobBody) => {
  return workflowClient.trigger({
    url: `${getBaseUrl()}/api/workflows/ingest`,
    body,
  });
};

export type TriggerDocumentJobBody = {
  documentId: string;
  cleanup?: boolean;
};

type TriggerReturnType<T extends object | object[]> = Promise<
  T extends Array<any> ? { workflowRunId: string }[] : { workflowRunId: string }
>;

export const triggerDocumentJob = async <
  T extends TriggerDocumentJobBody | TriggerDocumentJobBody[],
>(
  body: T,
) => {
  const url = `${getBaseUrl()}/api/workflows/process-document`;
  if (Array.isArray(body)) {
    return workflowClient.trigger(
      body.map((item) => ({
        url,
        body: item,
      })),
    ) as TriggerReturnType<T>;
  }

  return workflowClient.trigger({
    url,
    body,
  }) as TriggerReturnType<T>;
};

export type DeleteDocumentBody = {
  documentId: string;
  deleteJobWhenDone?: boolean;
  deleteNamespaceWhenDone?: boolean;
  deleteOrgWhenDone?: boolean;
};
export const triggerDeleteDocumentJob = async (body: DeleteDocumentBody) => {
  return workflowClient.trigger({
    url: `${getBaseUrl()}/api/workflows/delete-document`,
    body,
  });
};

export type DeleteIngestJobBody = {
  jobId: string;
  deleteNamespaceWhenDone?: boolean;
  deleteOrgWhenDone?: boolean;
};
export const triggerDeleteIngestJob = async (body: DeleteIngestJobBody) => {
  return workflowClient.trigger({
    url: `${getBaseUrl()}/api/workflows/delete-ingest-job`,
    body,
  });
};

export type DeleteNamespaceBody = {
  namespaceId: string;
  deleteOrgWhenDone?: boolean;
};
export const triggerDeleteNamespace = async (body: DeleteNamespaceBody) => {
  return workflowClient.trigger({
    url: `${getBaseUrl()}/api/workflows/delete-namespace`,
    body,
  });
};

export type MeterOrgDocumentsBody = {
  organizationId: string;
};
export const triggerMeterOrgDocuments = async <
  T extends MeterOrgDocumentsBody | MeterOrgDocumentsBody[],
>(
  body: T,
) => {
  const url = `${getBaseUrl()}/api/workflows/meter-org-documents`;
  if (Array.isArray(body)) {
    return workflowClient.trigger(
      body.map((item) => ({
        url,
        body: item,
      })),
    ) as TriggerReturnType<T>;
  }

  return workflowClient.trigger({
    url,
    body,
  }) as TriggerReturnType<T>;
};

export type ReIngestJobBody = {
  jobId: string;
};
export const triggerReIngestJob = async (body: ReIngestJobBody) => {
  return workflowClient.trigger({
    url: `${getBaseUrl()}/api/workflows/re-ingest`,
    body,
  });
};

type CancelArgs = Parameters<typeof workflowClient.cancel>[0];
export const cancelWorkflow = async (args: CancelArgs) => {
  return workflowClient.cancel(args);
};
