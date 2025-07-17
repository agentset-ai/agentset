import type { ReIngestJobBody } from "@/lib/workflow";
import { chunkArray } from "@/lib/functions";
import {
  qstashClient,
  qstashReceiver,
  triggerDocumentJob,
} from "@/lib/workflow";
import { serve } from "@upstash/workflow/nextjs";

import { db, DocumentStatus, IngestJobStatus } from "@agentset/db";

const BATCH_SIZE = 30;

export const { POST } = serve<ReIngestJobBody>(
  async (context) => {
    const ingestJob = await context.run("get-config", async () => {
      const { jobId } = context.requestPayload;
      const job = await db.ingestJob.findUnique({
        where: { id: jobId },
        include: { namespace: true },
      });

      if (!job) {
        throw new Error("Ingestion job not found");
      }

      return job;
    });

    const documents = await context.run("get-documents", async () => {
      const allDocuments = await db.document.findMany({
        where: { ingestJobId: ingestJob.id },
        select: { id: true },
      });

      return allDocuments;
    });

    await context.run("update-status-pre-processing", async () => {
      await db.$transaction([
        db.ingestJob.update({
          where: { id: ingestJob.id },
          data: {
            status: IngestJobStatus.PRE_PROCESSING,
            preProcessingAt: new Date(),
            processingAt: null,
            completedAt: null,
            failedAt: null,
            error: null,
          },
          select: { id: true },
        }),
        db.document.updateMany({
          where: { ingestJobId: ingestJob.id },
          data: {
            status: DocumentStatus.QUEUED_FOR_RESYNC,
            queuedAt: new Date(),
            preProcessingAt: null,
            processingAt: null,
            completedAt: null,
            failedAt: null,
            error: null,
          },
        }),
      ]);
    });

    const documentIdToWorkflowRunId = await context.run(
      "enqueue-documents",
      async () => {
        const documentIdToWorkflowRunIds = await triggerDocumentJob(
          documents.map((document) => ({
            documentId: document.id,
            cleanup: true,
          })),
        );

        return documentIdToWorkflowRunIds.map((data, idx) => ({
          documentId: documents[idx]!.id,
          workflowRunId: data.workflowRunId,
        }));
      },
    );

    await context.run("update-status-processing", async () => {
      await db.ingestJob.update({
        where: { id: ingestJob.id },
        data: {
          status: IngestJobStatus.PROCESSING,
          processingAt: new Date(),
        },
        select: { id: true },
      });
    });

    // update documents with workflowRunIds (in parallel)
    const batches = chunkArray(documentIdToWorkflowRunId, BATCH_SIZE);
    await Promise.all(
      batches.map((batch, i) =>
        context.run(`update-documents-with-workflowRunIds-${i}`, async () => {
          await db.$transaction(
            batch.map(({ documentId, workflowRunId }) =>
              db.document.update({
                where: { id: documentId },
                data: { workflowRunsIds: { push: workflowRunId } },
              }),
            ),
          );
        }),
      ),
    );
  },
  {
    failureFunction: async ({ context, failResponse }) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (context.requestPayload && context.requestPayload.jobId) {
        const { jobId } = context.requestPayload;

        await db.ingestJob.update({
          where: { id: jobId },
          data: {
            status: IngestJobStatus.FAILED,
            error: failResponse || "Unknown error",
            failedAt: new Date(),
          },
          select: { id: true },
        });
      }
    },
    qstashClient: qstashClient,
    receiver: qstashReceiver,
    flowControl: {
      key: "re-ingest-job",
      parallelism: 150,
      rate: 20,
      period: "5s",
    },
  },
);
