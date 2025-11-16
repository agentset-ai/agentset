import { schemaTask } from "@trigger.dev/sdk";

import { DocumentStatus, IngestJobStatus, Prisma } from "@agentset/db";
import { chunkArray } from "@agentset/utils";

import { getDb } from "../db";
import { RE_INGEST_JOB_ID, reIngestJobBodySchema } from "../schema";
import { processDocument } from "./process-document";

const BATCH_SIZE = 30;

export const reIngestJob = schemaTask({
  id: RE_INGEST_JOB_ID,
  maxDuration: 60 * 60 * 12, // 12 hours
  queue: {
    concurrencyLimit: 90,
  },
  retry: {
    maxAttempts: 1,
  },
  schema: reIngestJobBodySchema,
  onFailure: async ({ payload, error }) => {
    const db = getDb();

    const errorMessage =
      (error instanceof Error ? error.message : null) || "Unknown error";

    try {
      await db.ingestJob.update({
        where: { id: payload.jobId },
        data: {
          status: IngestJobStatus.FAILED,
          error: errorMessage,
          failedAt: new Date(),
        },
        select: { id: true },
      });
    } catch (e) {
      // skip not found errors
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      )
        return;
      throw e;
    }
  },
  run: async ({ jobId }, { ctx }) => {
    const db = getDb();

    // Get ingest job configuration
    const ingestJob = await db.ingestJob.findUnique({
      where: { id: jobId },
      include: {
        namespace: {
          select: {
            id: true,
            keywordEnabled: true,
            embeddingConfig: true,
            vectorStoreConfig: true,
            organization: {
              select: {
                id: true,
                plan: true,
                stripeId: true,
              },
            },
          },
        },
      },
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
    let success = true;
    let totalPages = 0;
    for (const chunk of chunks) {
      const handles = await processDocument.batchTriggerAndWait(
        chunk.map((document) => ({
          payload: {
            documentId: document.id,
            cleanup: true, // Enable cleanup for re-processing
            ingestJob,
          },
          options: {
            tags: [`doc_${document.id}`],
            priority: ctx.run.priority,
          },
        })),
      );

      for (const handle of handles.runs) {
        if (!handle.ok) {
          success = false;
        } else {
          totalPages += handle.output.pagesDelta;
        }
      }

      // await Promise.all(
      //   handles.map((batch) =>
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

    const pagesUpdate = (
      totalPages >= 0
        ? { totalPages: { increment: totalPages } }
        : {
            // add negative to make it positive, because we're decrementing the total pages
            totalPages: { decrement: -totalPages },
          }
    ) satisfies Prisma.NamespaceUpdateInput | Prisma.OrganizationUpdateInput;

    await db.$transaction([
      db.ingestJob.update({
        where: { id: ingestJob.id },
        data: {
          ...(success
            ? {
                status: IngestJobStatus.COMPLETED,
                completedAt: new Date(),
                failedAt: null,
                error: null,
              }
            : {
                status: IngestJobStatus.FAILED,
                completedAt: null,
                failedAt: new Date(),
                error: "Failed to process documents",
              }),
        },
        select: { id: true },
      }),
      db.namespace.update({
        where: { id: ingestJob.namespace.id },
        data: pagesUpdate,
        select: { id: true },
      }),
      db.organization.update({
        where: { id: ingestJob.namespace.organization.id },
        data: pagesUpdate,
        select: { id: true },
      }),
    ]);

    return {
      ingestJobId: ingestJob.id,
      documentsReprocessed: documents.length,
    };
  },
});
