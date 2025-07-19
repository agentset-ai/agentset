import { meterIngestedPages } from "@/lib/meters";
import { isProPlan } from "@/lib/plans";
import { redis } from "@/lib/redis";
import { schemaTask, wait } from "@trigger.dev/sdk";
import { embedMany } from "ai";

import type {
  PartitionBatch,
  PartitionBody,
  PartitionResult,
} from "@agentset/engine";
import { DocumentStatus, IngestJobStatus } from "@agentset/db";
import {
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
  getPartitionDocumentBody,
  KeywordStore,
  makeChunk,
} from "@agentset/engine";
import { env } from "@agentset/engine/env";
import { chunkArray } from "@agentset/utils";

import { TRIGGER_DOCUMENT_JOB_ID, triggerDocumentJobBodySchema } from "..";
import { getDb } from "./db";

const BATCH_SIZE = 30;

const partitionDocument = async (
  partitionBody: PartitionBody,
  documentId: string,
) => {
  // Step 1: Start partition process
  const response = await fetch(env.PARTITION_API_URL, {
    method: "POST",
    headers: {
      "api-key": env.PARTITION_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(partitionBody),
  });

  const body = await response.json();
  if (response.status !== 200 || !body?.call_id) {
    return {
      result: null,
      error: "Partition error",
    };
  }

  // Step 2: Poll for completion
  let attempts = 0;
  const maxAttempts = 288; // 24 hours with 5 minute intervals

  while (attempts < maxAttempts) {
    await wait.for({ minutes: 5 });

    // Check Redis for the partition result
    const eventData = await redis.get<PartitionResult>(
      `partition:${partitionBody.notify_id}`,
    );

    if (eventData) {
      // Clean up the event data from Redis
      await redis.del(`partition:${partitionBody.notify_id}`);

      if (eventData.status !== 200) {
        return {
          result: null,
          error: "Partition error",
        };
      }

      return {
        result: eventData,
        error: null,
      } as const;
    }

    attempts++;
  }

  return {
    result: null,
    error: "Partition timeout",
  };
};

export const processDocument = schemaTask({
  id: TRIGGER_DOCUMENT_JOB_ID,
  maxDuration: 7200, // 2 hours
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  schema: triggerDocumentJobBodySchema,
  onFailure: async ({ payload, error }) => {
    const db = getDb();

    const errorMessage = error instanceof Error ? error.message : String(error);
    await db.document.update({
      where: { id: payload.documentId },
      data: {
        status: DocumentStatus.FAILED,
        error: error || "Unknown error",
        failedAt: new Date(),
        ingestJob: {
          update: {
            status: IngestJobStatus.FAILED,
            failedAt: new Date(),
            error: error || "Unknown error",
          },
        },
      },
      select: { id: true },
    });
  },
  run: async ({ documentId, cleanup: shouldCleanup }) => {
    const db = getDb();

    // Get document configuration
    const documentData = await db.document.findUnique({
      where: { id: documentId },
      include: {
        ingestJob: {
          include: {
            namespace: {
              include: {
                organization: {
                  select: {
                    plan: true,
                    stripeId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!documentData) {
      throw new Error("Document not found");
    }

    const {
      ingestJob: { namespace, ...ingestJob },
      ...document
    } = documentData;

    // Update status to pre-processing
    await db.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.PRE_PROCESSING,
        preProcessingAt: new Date(),
      },
      select: { id: true },
    });

    const token = await wait.createToken({ timeout: "3h" });

    // Get partition document body
    const partitionBody = await getPartitionDocumentBody(
      document,
      ingestJob,
      namespace,
      token.id,
    );

    // Partition the document
    const { result: body, error } = await partitionDocument(
      partitionBody,
      documentId,
    );

    if (error || !body) {
      throw new Error(error || "Failed to partition document");
    }

    // Update document properties and status to processing
    const totalPages =
      body.total_pages && typeof body.total_pages === "number"
        ? body.total_pages
        : body.total_characters / 1000;

    await db.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.PROCESSING,
        processingAt: new Date(),
        totalCharacters: body.total_characters,
        totalChunks: body.total_chunks,
        totalPages,
        documentProperties: {
          fileSize: body.metadata.sizeInBytes,
          mimeType: body.metadata.filetype,
        },
      },
      select: { id: true },
    });

    // Get embedding model and vector store
    const [embeddingModel, vectorStore] = await Promise.all([
      getNamespaceEmbeddingModel(namespace, "document"),
      getNamespaceVectorStore(namespace, document.tenantId ?? undefined),
    ]);

    const keywordStore = new KeywordStore(
      namespace.id,
      document.tenantId ?? undefined,
    );

    // Clean up existing chunks if requested
    if (shouldCleanup) {
      // Get vector store chunk IDs to delete
      let paginationToken: string | undefined;
      const chunkIds: string[] = [];

      do {
        const chunks = await vectorStore.list({
          prefix: `${document.id}#`,
          paginationToken,
        });

        chunks.vectors?.forEach((chunk) => {
          if (chunk.id) {
            chunkIds.push(chunk.id);
          }
        });

        paginationToken = chunks.pagination?.next;
      } while (paginationToken);

      // Delete vector store chunks
      if (chunkIds.length > 0) {
        const batches = chunkArray(chunkIds, BATCH_SIZE);
        for (const batch of batches) {
          await vectorStore.delete(batch);
        }
      }

      // Clean up keyword store if enabled
      if (namespace.keywordEnabled) {
        let page = 1;
        let hasNextPage = true;
        const keywordChunkIds: string[] = [];

        do {
          const chunks = await keywordStore.listIds({
            documentId: document.id,
            page,
          });

          keywordChunkIds.push(...chunks.ids);
          hasNextPage = chunks.hasNextPage;
          page = chunks.currentPage + 1;
        } while (hasNextPage);

        if (keywordChunkIds.length > 0) {
          const batches = chunkArray(keywordChunkIds, BATCH_SIZE);
          for (const batch of batches) {
            await keywordStore.deleteByIds(batch);
          }
        }
      }
    }

    // Process all batches and embed chunks
    let totalTokens = 0;

    for (let batchIdx = 0; batchIdx < body.total_batches; batchIdx++) {
      const chunkBatch = await redis.get<PartitionBatch>(
        body.batch_template.replace("[BATCH_INDEX]", batchIdx.toString()),
      );

      if (!chunkBatch) {
        throw new Error("Chunk batch not found");
      }

      const results = await embedMany({
        model: embeddingModel,
        values: chunkBatch.map((chunk) => chunk.text),
      });

      const nodes = chunkBatch.map((chunk, idx) =>
        makeChunk({
          documentId: document.id,
          chunk,
          embedding: results.embeddings[idx]!,
        }),
      );

      // Upsert to vector store
      await vectorStore.upsert(nodes);

      // Store in keyword store if enabled
      if (namespace.keywordEnabled) {
        await keywordStore.upsert(
          nodes.map((node, idx) => ({
            id: node.id,
            text: chunkBatch[idx]!.text,
            documentId: document.id,
            metadata: node.metadata,
          })),
        );
      }

      totalTokens += results.usage.tokens;
    }

    // Update status to completed
    await db.$transaction([
      db.document.update({
        where: { id: document.id },
        data: {
          status: DocumentStatus.COMPLETED,
          totalTokens,
          completedAt: new Date(),
          failedAt: null,
          error: null,
        },
        select: { id: true },
      }),
      // Update namespace + organization total pages
      db.namespace.update({
        where: { id: namespace.id },
        data: {
          totalPages: { increment: totalPages },
          organization: {
            update: {
              totalPages: { increment: totalPages },
            },
          },
        },
        select: { id: true },
      }),
    ]);

    // Delete all chunks from redis
    const keys = new Array(body.total_batches)
      .fill(null)
      .map((_, idx) =>
        body.batch_template.replace("[BATCH_INDEX]", idx.toString()),
      );

    const keyBatches = chunkArray(keys, 150);
    for (const keyBatch of keyBatches) {
      await redis.del(...keyBatch);
    }

    // Log usage to stripe
    const stripeCustomerId = namespace.organization.stripeId;
    if (
      isProPlan(namespace.organization.plan) &&
      !!stripeCustomerId &&
      !shouldCleanup // don't log usage if re-processing
    ) {
      await meterIngestedPages({
        documentId: document.id,
        totalPages,
        stripeCustomerId,
      });
    }

    return {
      documentId: document.id,
      totalPages,
      totalTokens,
      totalChunks: body.total_chunks,
    };
  },
});
