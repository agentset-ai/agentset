import type { DeleteIngestJobBody } from "@/lib/workflow";
import { chunkArray } from "@/lib/functions";
import {
  cancelWorkflow,
  qstashClient,
  qstashReceiver,
  triggerDeleteDocumentJob,
} from "@/lib/workflow";
import { serve } from "@upstash/workflow/nextjs";

import { db, DocumentStatus, IngestJobStatus } from "@agentset/db";

const BATCH_SIZE = 30;

export const { POST } = serve<DeleteIngestJobBody>(
  async (context) => {
    const data = await context.run("get-config", async () => {
      const { jobId } = context.requestPayload;
      const job = await db.ingestJob.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          tenantId: true,
          payload: true,
          workflowRunsIds: true,
          namespace: { select: { id: true, organizationId: true } },
        },
      });

      const shouldDeleteNamespace =
        context.requestPayload.deleteNamespaceWhenDone ?? false;
      const shouldDeleteOrg = context.requestPayload.deleteOrgWhenDone ?? false;

      if (!job) {
        return {
          notFound: true,
          shouldDeleteNamespace: false,
          shouldDeleteOrg: false,
        };
      }

      return {
        ...job,
        shouldDeleteNamespace,
        shouldDeleteOrg,
      };
    });

    if ("notFound" in data) {
      return;
    }

    const { namespace, shouldDeleteNamespace, shouldDeleteOrg, ...ingestJob } =
      data;

    await context.run("update-status-deleting", async () => {
      await db.ingestJob.update({
        where: { id: ingestJob.id },
        data: {
          status: IngestJobStatus.DELETING,
        },
        select: { id: true },
      });
    });

    await context.run("cancel-ingest-job-workflows", async () => {
      const currentWorkflowRunId = context.workflowRunId;
      const idsToCancel = ingestJob.workflowRunsIds.filter(
        (id) => id !== currentWorkflowRunId,
      );

      if (idsToCancel.length > 0) {
        await cancelWorkflow({ ids: idsToCancel });
      }
    });

    // TODO: delete files if they exist (ingestJob.payload.source)

    const documents = await context.run("get-documents", async () => {
      const documents = await db.document.findMany({
        where: { ingestJobId: ingestJob.id },
        select: { id: true },
      });

      return documents;
    });

    const shouldEnqueueDeleteDocuments = documents.length > 0;

    // enqueue delete documents in parallel
    if (shouldEnqueueDeleteDocuments) {
      const batches = chunkArray(documents, BATCH_SIZE);
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]!;
        await context.run(`enqueue-delete-documents-${i}`, async () => {
          await db.document.updateMany({
            where: { id: { in: batch.map((d) => d.id) } },
            data: { status: DocumentStatus.DELETING },
          });

          const results = await triggerDeleteDocumentJob(
            batch.map((document) => ({
              documentId: document.id,
              deleteJobWhenDone: true,
              deleteNamespaceWhenDone: shouldDeleteNamespace,
              deleteOrgWhenDone: shouldDeleteOrg,
            })),
          );

          const docIdToWorkflowRunId = results.reduce(
            (acc, curr, idx) => {
              acc[batch[idx]!.id] = curr.workflowRunId;
              return acc;
            },
            {} as Record<string, string>,
          );

          // update documents with workflowRunIds
          await db.$transaction(
            batch.map((document) =>
              db.document.update({
                where: { id: document.id },
                data: {
                  workflowRunsIds: {
                    push: docIdToWorkflowRunId[document.id],
                  },
                },
              }),
            ),
          );

          return Object.values(docIdToWorkflowRunId);
        });
      }
    } else {
      await context.run("delete-ingest-job", async () => {
        await db.$transaction([
          db.ingestJob.delete({
            where: { id: ingestJob.id },
            select: { id: true },
          }),
          db.namespace.update({
            where: { id: namespace.id },
            select: { id: true },
            data: {
              totalIngestJobs: { decrement: 1 },
              organization: {
                update: {
                  totalIngestJobs: { decrement: 1 },
                },
              },
            },
          }),
        ]);
      });

      if (shouldDeleteNamespace) {
        await context.run("check-and-delete-namespace", async () => {
          const job = await db.ingestJob.findFirst({
            where: { namespaceId: namespace.id },
            select: { id: true },
          });

          if (!job) {
            await db.$transaction([
              db.namespace.delete({
                where: { id: namespace.id },
                select: { id: true },
              }),
              db.organization.update({
                where: { id: namespace.organizationId },
                select: { id: true },
                data: { totalNamespaces: { decrement: 1 } },
              }),
            ]);
            return true;
          }

          return false;
        });
      }

      if (shouldDeleteOrg) {
        await context.run("check-and-delete-org", async () => {
          const ns = await db.namespace.findFirst({
            where: { organizationId: namespace.organizationId },
            select: { id: true },
          });

          if (!ns) {
            await db.organization
              .delete({
                where: { id: namespace.organizationId },
              })
              .catch((e) => {
                if (e.code === "P2025") {
                  return null; // already deleted
                }

                throw e;
              });
            return true;
          }

          return false;
        });
      }
    }
  },
  {
    qstashClient: qstashClient,
    receiver: qstashReceiver,
    flowControl: {
      key: "delete-ingest-job",
      parallelism: 50,
      rate: 5,
      period: "3s",
    },
  },
);
