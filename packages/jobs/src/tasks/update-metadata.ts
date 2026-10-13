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
  maxDuration: 3600,
  queue: { concurrencyLimit: 1 },
  retry: { maxAttempts: 5 },
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
      // Lock the parent job before the document, matching the lock order of
      // reingestion. Lifecycle changes wait until the metadata write commits.
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

      const updated = await db.$transaction(
        async (transaction) => {
          const job = await lockJob(transaction, document.ingestJobId, payload);
          if (!job) return false;

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
          const lockedDocument = documents[0];
          if (!lockedDocument) return false;
          ensureStable(lockedDocument.status);

          const currentDocument = await transaction.document.findUniqueOrThrow({
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

          const chunksFile = await getChunksJsonFromS3<ChunksFile>(
            namespace.id,
            documentId,
          );
          vectorStore ??= await getNamespaceVectorStore(
            namespace,
            payload.tenantId,
          );

          await vectorStore.updateDocumentMetadata(
            documentId,
            effectiveMetadata,
            chunksFile?.chunks.map((chunk) => chunk.id),
          );
          await updateChunksFile(
            namespace.id,
            documentId,
            chunksFile,
            effectiveMetadata,
          );

          // Config commits only after the corresponding external writes
          // succeed. Repeating a partly completed run applies the same keys.
          if (jobIds.length === 0) {
            await mergeDocumentMetadata(
              transaction,
              documentId,
              payload.metadata,
            );
          }

          return true;
        },
        { timeout: TRANSACTION_TIMEOUT_MS, maxWait: 15_000 },
      );

      if (updated) result.updatedDocuments++;
      else result.skippedDocuments++;
    }

    logger.info("Metadata update completed", {
      namespaceId: payload.namespaceId,
      ...result,
    });
    return result;
  }),
});
