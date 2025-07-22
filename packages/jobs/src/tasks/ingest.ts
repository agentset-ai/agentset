import { schemaTask } from "@trigger.dev/sdk";

import type { Document, Prisma } from "@agentset/db";
import { DocumentStatus, IngestJobStatus } from "@agentset/db";
import { chunkArray } from "@agentset/utils";

import {
  TRIGGER_INGESTION_JOB_ID,
  triggerIngestionJobBodySchema,
} from "../index";
import { getDb } from "./db";
import { processDocument } from "./process-document";

const BATCH_SIZE = 30;

export const ingestJob = schemaTask({
  id: TRIGGER_INGESTION_JOB_ID,
  maxDuration: 60 * 60 * 12, // 12 hours
  queue: {
    concurrencyLimit: 30,
  },
  machine: {
    preset: "large-1x",
  },
  schema: triggerIngestionJobBodySchema,
  onFailure: async ({ payload, error }) => {
    const db = getDb();

    const errorMessage =
      (error instanceof Error ? error.message : null) || "Unknown error";
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

    // Get ingestion job configuration
    const ingestionJob = await db.ingestJob.findUnique({
      where: { id: jobId },
      include: { namespace: true },
    });

    if (!ingestionJob) {
      throw new Error("Ingestion job not found");
    }

    // Update status to pre-processing
    await db.ingestJob.update({
      where: { id: ingestionJob.id },
      data: {
        status: IngestJobStatus.PRE_PROCESSING,
        preProcessingAt: new Date(),
      },
      select: { id: true },
    });

    const commonData = {
      status: DocumentStatus.QUEUED,
      tenantId: ingestionJob.tenantId,
      ingestJobId: ingestionJob.id,
    } satisfies Partial<Prisma.DocumentCreateArgs["data"]>;

    let documents: Pick<Document, "id">[] = [];

    if (
      ingestionJob.payload.type === "FILE" ||
      ingestionJob.payload.type === "TEXT" ||
      ingestionJob.payload.type === "MANAGED_FILE"
    ) {
      // Handle single document types
      if (ingestionJob.payload.type === "TEXT") {
        const { text } = ingestionJob.payload;
        const document = await db.document.create({
          data: {
            ...commonData,
            name: ingestionJob.payload.fileName,
            source: {
              type: "TEXT",
              text,
            },
            totalCharacters: text.length,
          },
          select: { id: true },
        });

        documents = [document];
      } else if (ingestionJob.payload.type === "FILE") {
        const { fileUrl } = ingestionJob.payload;
        const document = await db.document.create({
          data: {
            ...commonData,
            name: ingestionJob.payload.fileName,
            source: {
              type: "FILE",
              fileUrl: fileUrl,
            },
          },
          select: { id: true },
        });

        documents = [document];
      } else if (ingestionJob.payload.type === "MANAGED_FILE") {
        const { key } = ingestionJob.payload;
        const document = await db.document.create({
          data: {
            ...commonData,
            name: ingestionJob.payload.fileName,
            source: {
              type: "MANAGED_FILE",
              key: key,
            },
          },
          select: { id: true },
        });

        documents = [document];
      }
    } else {
      // Handle batch document creation for multi-file types
      const batches = chunkArray(ingestionJob.payload.items, 20);

      for (let i = 0; i < batches.length; i++) {
        const fileBatch = batches[i]!;
        const batchResult = await db.document.createManyAndReturn({
          select: { id: true },
          data: fileBatch.map(({ config, fileName, ...file }) => ({
            ...commonData,
            name: fileName,
            source: file,
            config,
          })),
        });

        documents = documents.concat(batchResult);
      }
    }

    // Update total documents in namespace + organization
    await db.namespace.update({
      where: { id: ingestionJob.namespace.id },
      data: {
        totalDocuments: { increment: documents.length },
        organization: {
          update: {
            totalDocuments: { increment: documents.length },
          },
        },
      },
      select: { id: true },
    });

    // Update status to processing
    await db.ingestJob.update({
      where: { id: ingestionJob.id },
      data: {
        status: IngestJobStatus.PROCESSING,
        processingAt: new Date(),
      },
      select: { id: true },
    });

    const chunks = chunkArray(documents, BATCH_SIZE);
    let success = true;
    for (const chunk of chunks) {
      const handles = await processDocument.batchTriggerAndWait(
        chunk.map((document) => ({
          payload: { documentId: document.id },
        })),
      );

      if (handles.runs.some((run) => !run.ok)) success = false;

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

    await db.ingestJob.update({
      where: { id: ingestionJob.id },
      data: {
        status: success ? IngestJobStatus.COMPLETED : IngestJobStatus.FAILED,
        completedAt: new Date(),
        failedAt: null,
        error: null,
      },
      select: { id: true },
    });

    return {
      ingestionJobId: ingestionJob.id,
      documentsCreated: documents.length,
    };
  },
});
