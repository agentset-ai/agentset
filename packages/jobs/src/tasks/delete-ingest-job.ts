import { schemaTask } from "@trigger.dev/sdk";

import { DocumentStatus, IngestJobStatus } from "@agentset/db";
import { chunkArray } from "@agentset/utils";

import { DELETE_INGEST_JOB_ID, deleteIngestJobBodySchema } from "../index";
import { getDb } from "./db";
import { deleteDocument } from "./delete-document";

const BATCH_SIZE = 30;

export const deleteIngestJob = schemaTask({
  id: DELETE_INGEST_JOB_ID,
  maxDuration: 60 * 30, // 30 minutes
  queue: {
    concurrencyLimit: 50,
  },
  schema: deleteIngestJobBodySchema,
  run: async ({ jobId }) => {
    const db = getDb();

    // Get ingest job data
    const ingestJob = await db.ingestJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        tenantId: true,
        payload: true,
      },
    });

    if (!ingestJob) {
      return {
        jobId,
        deleted: false,
        reason: "Ingest job not found",
      };
    }

    // Update status to deleting
    await db.ingestJob.update({
      where: { id: ingestJob.id },
      data: {
        status: IngestJobStatus.DELETING,
      },
      select: {},
    });

    // Cancel any running workflows for this ingest job
    // Note: In Trigger.dev, we can't directly cancel runs like in Upstash,
    // but we can track this for monitoring purposes
    // TODO: cancel document workflows
    // TODO: cancel ingest job workflow

    // Get all documents for this ingest job
    const documents = await db.document.findMany({
      where: { ingestJobId: ingestJob.id },
      select: { id: true },
    });

    // Trigger document deletion tasks (parent-child pattern)
    if (documents.length > 0) {
      // Update document statuses to deleting
      await db.document.updateMany({
        where: { id: { in: documents.map((d) => d.id) } },
        data: { status: DocumentStatus.DELETING },
      });

      // Trigger delete document tasks in batches
      const batches = chunkArray(documents, BATCH_SIZE);

      for (const batch of batches) {
        await deleteDocument.batchTriggerAndWait(
          batch.map((document) => ({
            payload: {
              documentId: document.id,
            },
          })),
        );
      }
    }

    await db.ingestJob.delete({
      where: { id: ingestJob.id },
      select: {},
    });

    return {
      jobId: ingestJob.id,
      deleted: true,
    };
  },
});
