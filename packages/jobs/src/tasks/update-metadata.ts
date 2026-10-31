import type { z } from "zod/v4";
import { logger, schemaTask } from "@trigger.dev/sdk";

import type { DocumentStatus, IngestJobStatus, Prisma } from "@agentset/db";
import type { ChunksFile, VectorStore } from "@agentset/engine";
import { getNamespaceVectorStore } from "@agentset/engine";
import {
  getChunksJsonFromS3,
  makeChunksKey,
  uploadObject,
} from "@agentset/storage";
import { metadataPatchSchema } from "@agentset/validation";

import { getDb } from "../db";
import { sanitizeRunErrors } from "../errors";
import { getMetadataUpdatePatch } from "../metadata-store";
import {
  metadataUpdateRequestSchema,
  UPDATE_METADATA_JOB_ID,
  updateMetadataBodySchema,
} from "../schema";

type UpdateMetadataBody = z.infer<typeof metadataUpdateRequestSchema>;
type Metadata = UpdateMetadataBody["metadata"];

const STABLE_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
const TRANSACTION_TIMEOUT_MS = 120_000;
const TRANSACTION_MAX_WAIT_MS = 15_000;
const TASK_MAX_DURATION_SECONDS = 3600;
const TASK_MAX_ATTEMPTS = 5;
const TASK_CONCURRENCY_LIMIT = 1;

class MetadataDocumentDeletedError extends Error {}

const ensureStable = (status: DocumentStatus | IngestJobStatus) => {
  if (!STABLE_STATUSES.has(status)) {
    throw new Error("Metadata cannot be updated while ingestion is active");
  }
};

const lockJob = async (
  transaction: Prisma.TransactionClient,
  jobId: string,
  { namespaceId, tenantId }: UpdateMetadataBody,
) => {
  const jobs = await transaction.$queryRaw<
    { id: string; status: IngestJobStatus }[]
  >`
    SELECT "id", "status" FROM "ingest_job"
    WHERE "id" = ${jobId}
      AND "namespaceId" = ${namespaceId}
      AND "tenantId" IS NOT DISTINCT FROM ${tenantId}::text
    FOR UPDATE
  `;

  const job = jobs[0];
  if (job) ensureStable(job.status);
  return job;
};

const mergeJobMetadata = async (
  transaction: Prisma.TransactionClient,
  jobId: string,
  metadata: Metadata,
) => {
  await transaction.$executeRaw`
    UPDATE "ingest_job"
    SET "config" = jsonb_set(
      COALESCE(NULLIF("config", 'null'::jsonb), '{}'::jsonb),
      '{metadata}',
      COALESCE(NULLIF("config"->'metadata', 'null'::jsonb), '{}'::jsonb)
        || ${JSON.stringify(metadata)}::jsonb
    ), "updatedAt" = NOW()
    WHERE "id" = ${jobId}
  `;
};

const withLockedDocument = <T>(
  documentId: string,
  ingestJobId: string,
  payload: UpdateMetadataBody,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
) =>
  getDb().$transaction(
    async (transaction) => {
      // Keep the parent-before-document lock order used by reingestion.
      const job = await lockJob(transaction, ingestJobId, payload);
      if (!job) throw new MetadataDocumentDeletedError();

      const documents = await transaction.$queryRaw<
        { id: string; status: DocumentStatus }[]
      >`
        SELECT "id", "status" FROM "document"
        WHERE "id" = ${documentId}
          AND "namespaceId" = ${payload.namespaceId}
          AND "tenantId" IS NOT DISTINCT FROM ${payload.tenantId}::text
          AND "ingestJobId" = ${job.id}
        FOR UPDATE
      `;
      const document = documents[0];
      if (!document) throw new MetadataDocumentDeletedError();
      ensureStable(document.status);

      return operation(transaction);
    },
    { timeout: TRANSACTION_TIMEOUT_MS, maxWait: TRANSACTION_MAX_WAIT_MS },
  );

const mergeDocumentMetadata = async (
  transaction: Prisma.TransactionClient,
  documentId: string,
  metadata: Metadata,
) => {
  await transaction.$executeRaw`
    UPDATE "document"
    SET "config" = jsonb_set(
      COALESCE(NULLIF("config", 'null'::jsonb), '{}'::jsonb),
      '{metadata}',
      COALESCE(NULLIF("config"->'metadata', 'null'::jsonb), '{}'::jsonb)
        || ${JSON.stringify(metadata)}::jsonb
    ), "updatedAt" = NOW()
    WHERE "id" = ${documentId}
  `;
};

const updateChunksFile = async (
  namespaceId: string,
  documentId: string,
  chunksFile: ChunksFile | null,
  metadata: Metadata,
) => {
  // Ordinary file ingestion may not save a chunks export, and failed
  // documents can stop before a chunks file is created.
  if (!chunksFile) return;

  await uploadObject(
    makeChunksKey(namespaceId, documentId),
    JSON.stringify({
      ...chunksFile,
      metadata: { ...chunksFile.metadata, ...metadata },
      chunks: chunksFile.chunks.map((chunk) => ({
        ...chunk,
        metadata: { ...chunk.metadata, ...metadata },
      })),
    }),
    { contentType: "application/json" },
  );
};

export const updateMetadata = schemaTask({
  id: UPDATE_METADATA_JOB_ID,
  schema: updateMetadataBodySchema,
  maxDuration: TASK_MAX_DURATION_SECONDS,
  queue: { concurrencyLimit: TASK_CONCURRENCY_LIMIT },
  retry: { maxAttempts: TASK_MAX_ATTEMPTS },
  run: sanitizeRunErrors(async (taskPayload) => {
    let payload: UpdateMetadataBody;
    if ("metadataRequestId" in taskPayload) {
      const metadata = await getMetadataUpdatePatch(
        taskPayload.metadataRequestId,
      );
      if (metadata === null) {
        throw new Error("Metadata update payload not found or expired");
      }
      payload = metadataUpdateRequestSchema.parse({
        ...taskPayload,
        metadata: metadataPatchSchema.parse(metadata),
      });
    } else {
      payload = metadataUpdateRequestSchema.parse(taskPayload);
    }

    const db = getDb();
    const namespace = await db.namespace.findUnique({
      where: { id: payload.namespaceId },
      select: { id: true, vectorStoreConfig: true },
    });
    const jobIds = [...new Set(payload.jobIds)];
    const documentIds = [...new Set(payload.documentIds)];
    const result = {
      updatedDocuments: 0,
      updatedJobs: 0,
      skippedDocuments: 0,
      skippedJobs: 0,
    };

    if (!namespace) {
      return {
        ...result,
        skippedDocuments: documentIds.length,
        skippedJobs: jobIds.length,
      };
    }

    for (const jobId of jobIds) {
      const updated = await db.$transaction(async (transaction) => {
        const job = await lockJob(transaction, jobId, payload);
        if (!job) return false;

        await mergeJobMetadata(transaction, job.id, payload.metadata);
        return true;
      });

      if (updated) result.updatedJobs++;
      else result.skippedJobs++;
    }

    let vectorStore: VectorStore | undefined;
    for (const documentId of documentIds) {
      const document = await db.document.findFirst({
        where: {
          id: documentId,
          namespaceId: payload.namespaceId,
          tenantId: payload.tenantId,
          ...(jobIds.length > 0 && { ingestJobId: { in: jobIds } }),
        },
        select: { ingestJobId: true },
      });

      if (!document) {
        result.skippedDocuments++;
        continue;
      }

      try {
        const effectiveMetadata = await withLockedDocument(
          documentId,
          document.ingestJobId,
          payload,
          async (transaction) => {
            const currentDocument =
              await transaction.document.findUniqueOrThrow({
                where: { id: documentId },
                select: { config: true },
              });

            // A job supplies defaults. Keep the document's own overrides for
            // requested keys; document updates instead set those overrides.
            const effectiveMetadata = { ...payload.metadata };
            if (jobIds.length > 0) {
              const overrides = currentDocument.config?.metadata;
              for (const key of Object.keys(effectiveMetadata)) {
                if (overrides && Object.hasOwn(overrides, key)) {
                  effectiveMetadata[key] = overrides[key]!;
                }
              }
            }

            // Persist the intended settings before provider writes. Retries and
            // reingestion then use them even if only some batches have succeeded.
            if (jobIds.length === 0) {
              await mergeDocumentMetadata(
                transaction,
                documentId,
                payload.metadata,
              );
            }

            return effectiveMetadata;
          },
        );

        const chunksFile = await getChunksJsonFromS3<ChunksFile>(
          namespace.id,
          documentId,
        );
        vectorStore ??= await getNamespaceVectorStore(
          namespace,
          payload.tenantId,
        );

        // Each provider batch has its own lifecycle guard and transaction.
        // The complete document update can outlive a transaction's timeout.
        await vectorStore.updateDocumentMetadata(
          documentId,
          effectiveMetadata,
          chunksFile?.chunks.map((chunk) => chunk.id),
          {
            runBatch: (write) =>
              withLockedDocument(
                documentId,
                document.ingestJobId,
                payload,
                write,
              ),
          },
        );

        await withLockedDocument(
          documentId,
          document.ingestJobId,
          payload,
          async () => {
            // Reingestion may have replaced the export between batches. Read
            // it again while locked instead of overwriting it with an old copy.
            const currentChunksFile = await getChunksJsonFromS3<ChunksFile>(
              namespace.id,
              documentId,
            );
            await updateChunksFile(
              namespace.id,
              documentId,
              currentChunksFile,
              effectiveMetadata,
            );
          },
        );
        result.updatedDocuments++;
      } catch (error) {
        if (!(error instanceof MetadataDocumentDeletedError)) throw error;
        result.skippedDocuments++;
      }
    }

    logger.info("Metadata update completed", {
      namespaceId: payload.namespaceId,
      ...result,
    });
    return result;
  }),
});
