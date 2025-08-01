import { schemaTask, wait } from "@trigger.dev/sdk";
import { embedMany } from "ai";

import type { PartitionBatch, PartitionResult } from "@agentset/engine";
import { DocumentStatus } from "@agentset/db";
import {
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
  getPartitionDocumentBody,
  KeywordStore,
  makeChunk,
} from "@agentset/engine";
import { env } from "@agentset/engine/env";
import { meterIngestedPages } from "@agentset/stripe";
import { isProPlan } from "@agentset/stripe/plans";
import { chunkArray } from "@agentset/utils";

import { getDb } from "../db";
import { redis } from "../redis";
import {
  TRIGGER_DOCUMENT_JOB_ID,
  triggerDocumentJobBodySchema,
} from "../schema";

const BATCH_SIZE = 30;

export const processDocument = schemaTask({
  id: TRIGGER_DOCUMENT_JOB_ID,
  maxDuration: 60 * 60, // 1 hour
  queue: {
    concurrencyLimit: 95,
  },
  schema: triggerDocumentJobBodySchema,
  onFailure: async ({ payload, error }) => {
    const db = getDb();

    const errorMessage =
      (error instanceof Error ? error.message : null) || "Unknown error";
    await db.document.update({
      where: { id: payload.documentId },
      data: {
        status: DocumentStatus.FAILED,
        error: errorMessage,
        failedAt: new Date(),
      },
      select: { id: true },
    });
  },
  run: async ({ documentId, ingestJob, cleanup: shouldCleanup }) => {
    const db = getDb();

    // Get document configuration
    const document = await db.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        source: true,
        config: true,
        totalPages: true,
      },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // Update status to pre-processing
    await db.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.PRE_PROCESSING,
        preProcessingAt: new Date(),
      },
      select: { id: true },
    });

    const token = await wait.createToken({ timeout: "2h" });

    // Get partition document body
    const partitionBody = await getPartitionDocumentBody(
      document,
      ingestJob,
      ingestJob.namespace,
      {
        triggerTokenId: token.id,
        triggerAccessToken: token.publicAccessToken,
      },
    );

    // Partition the document
    const response = await fetch(env.PARTITION_API_URL, {
      method: "POST",
      headers: {
        "api-key": env.PARTITION_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(partitionBody),
    });

    const initialBody = (await response.json()) as { call_id: string };
    if (response.status !== 200 || !initialBody.call_id) {
      throw new Error("Partition Error");
    }

    // This must be called inside a task run function
    const result = await wait
      .forToken<PartitionResult | undefined>(token.id)
      .unwrap();

    if (!result || result.status !== 200) {
      throw new Error("Partition Error");
    }

    // Update document properties and status to processing
    const totalPages =
      result.total_pages && typeof result.total_pages === "number"
        ? result.total_pages
        : result.total_characters / 1000;

    await db.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.PROCESSING,
        processingAt: new Date(),
        totalCharacters: result.total_characters,
        totalChunks: result.total_chunks,
        totalPages,
        documentProperties: {
          fileSize: result.metadata.sizeInBytes,
          mimeType: result.metadata.filetype,
        },
      },
      select: { id: true },
    });

    // Get embedding model and vector store
    const [embeddingModel, vectorStore] = await Promise.all([
      getNamespaceEmbeddingModel(ingestJob.namespace, "document"),
      getNamespaceVectorStore(
        ingestJob.namespace,
        document.tenantId ?? undefined,
      ),
    ]);

    const keywordStore = new KeywordStore(
      ingestJob.namespace.id,
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
      if (ingestJob.namespace.keywordEnabled) {
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

    for (let batchIdx = 0; batchIdx < result.total_batches; batchIdx++) {
      const chunkBatch = await redis.get<PartitionBatch>(
        result.batch_template.replace("[BATCH_INDEX]", batchIdx.toString()),
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
      if (ingestJob.namespace.keywordEnabled) {
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

    await db.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.COMPLETED,
        totalTokens,
        completedAt: new Date(),
        failedAt: null,
        error: null,
      },
      select: { id: true },
    });

    // Delete all chunks from redis
    const keys = new Array(result.total_batches)
      .fill(null)
      .map((_, idx) =>
        result.batch_template.replace("[BATCH_INDEX]", idx.toString()),
      );

    const keyBatches = chunkArray(keys, 150);
    for (const keyBatch of keyBatches) {
      await redis.del(...keyBatch);
    }

    let meterSuccess = null;

    // Log usage to stripe
    const stripeCustomerId = ingestJob.namespace.organization.stripeId;
    if (
      isProPlan(ingestJob.namespace.organization.plan) &&
      !!stripeCustomerId &&
      !shouldCleanup // don't log usage if re-processing
    ) {
      try {
        await meterIngestedPages({
          documentId: `doc_${document.id}`,
          totalPages,
          stripeCustomerId,
        });
        meterSuccess = true;
      } catch {
        meterSuccess = false;
      }
    }

    const delta = totalPages - document.totalPages;
    return {
      documentId: document.id,
      totalPages,
      totalTokens,
      totalChunks: result.total_chunks,
      meterSuccess,
      pagesDelta: shouldCleanup ? delta : totalPages,
    };
  },
});
