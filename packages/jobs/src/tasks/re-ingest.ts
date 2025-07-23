import { schemaTask } from "@trigger.dev/sdk";

import { DocumentStatus, IngestJobStatus } from "@agentset/db";
import { chunkArray } from "@agentset/utils";

import { getDb } from "../db";
import { RE_INGEST_JOB_ID, reIngestJobBodySchema } from "../schema";
import { processDocument } from "./process-document";

const BATCH_SIZE = 30;

export const reIngestJob = schemaTask({
  id: RE_INGEST_JOB_ID,
  maxDuration: 3600, // 1 hour
  schema: reIngestJobBodySchema,
  onFailure: async ({ payload, error }) => {
    const db = getDb();

    const errorMessage = error instanceof Error ? error.message : String(error);
    await db.ingestJob.update({
      where: { id: payload.jobId },
      data: {
        status: IngestJobStatus.FAILED,
        error: errorMessage,
        failedAt: new Date(),
      },
      select: { id: true },
    });
  },
  run: async ({ jobId }) => {
    const db = getDb();

    // Get ingest job configuration
    const ingestJob = await db.ingestJob.findUnique({
      where: { id: jobId },
      include: { namespace: true },
    });

    if (!ingestJob) {
      throw new Error("Ingest job not found");
    }

    // Get all documents for this ingest job
    const documents = await db.document.findMany({
      where: { ingestJobId: ingestJob.id },
      select: { id: true },
    });

    // Update status to pre-processing and reset document statuses
    await db.$transaction([
      db.ingestJob.update({
        where: { id: ingestJob.id },
        data: {
          status: IngestJobStatus.PROCESSING,
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

    const chunks = chunkArray(documents, BATCH_SIZE);
    for (const chunk of chunks) {
      await processDocument.batchTriggerAndWait(
        chunk.map((document) => ({
          payload: {
            documentId: document.id,
            cleanup: true, // Enable cleanup for re-processing
          },
        })),
      );

      // TODO:
      // Update documents with run IDs (in parallel)
      // const documentIdToRunId = documents.map((document, idx) => ({
      //   documentId: document.id,
      //   runId: documentHandles.runs[idx]!.id,
      // }));
      // await Promise.all(
      //   batches.map((batch) =>
      //     db.$transaction(
      //       batch.map(({ documentId, runId }) =>
      //         db.document.update({
      //           where: { id: documentId },
      //           data: { workflowRunsIds: { push: runId } },
      //         }),
      //       ),
      //     ),
      //   ),
      // );
    }

    await db.ingestJob.update({
      where: { id: ingestJob.id },
      data: {
        status: IngestJobStatus.COMPLETED,
        completedAt: new Date(),
        failedAt: null,
        error: null,
      },
      select: { id: true },
    });

    return {
      ingestJobId: ingestJob.id,
      documentsReprocessed: documents.length,
    };
  },
});
