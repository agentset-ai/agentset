import { schemaTask, wait } from "@trigger.dev/sdk";
import { Ratelimit } from "@upstash/ratelimit";
import { embedMany } from "ai";

import type {
  CrawlPartitionResultDocument,
  PartitionBatch,
  PartitionResult,
  YoutubePartitionResultDocument,
} from "@agentset/engine";
import { DocumentStatus, Prisma } from "@agentset/db";
import {
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
  getPartitionDocumentBody,
  KeywordStore,
  makeChunk,
} from "@agentset/engine";
import { env } from "@agentset/engine/env";
import { getChunksJsonFromS3 } from "@agentset/storage";
import { meterIngestedPages } from "@agentset/stripe";
import { isProPlan } from "@agentset/stripe/plans";
import { chunkArray } from "@agentset/utils";

import { getDb } from "../db";
import { rateLimit } from "../rate-limit";
import { redis } from "../redis";
import {
  TRIGGER_DOCUMENT_JOB_ID,
  triggerDocumentJobBodySchema,
} from "../schema";

const BATCH_SIZE = 30;

const processBatch = async (
  batch: PartitionBatch,
  {
    embeddingModel,
    vectorStore,
    keywordStore,
    documentId,
    extraMetadata,
  }: {
    embeddingModel: Awaited<ReturnType<typeof getNamespaceEmbeddingModel>>;
    vectorStore: Awaited<ReturnType<typeof getNamespaceVectorStore>>;
    keywordStore: KeywordStore | null;
    documentId: string;
    extraMetadata?: Record<string, unknown>;
  },
) => {
  const results = await embedMany({
    model: embeddingModel,
    values: batch.map((chunk) => chunk.text),
    maxRetries: 5,
  });

  const chunks = batch.map((chunk, idx) => ({
    documentId,
    chunk: {
      ...chunk,
      metadata: {
        ...extraMetadata,
        ...chunk.metadata,
      },
    },
    embedding: results.embeddings[idx]!,
  }));

  // Upsert to vector store
  await vectorStore.upsert({ chunks });

  // Store in keyword store if enabled
  if (keywordStore) {
    const nodes = chunks.map((chunk) => makeChunk(chunk));
    await keywordStore.upsert(
      nodes.map((node, idx) => ({
        id: node.id,
        text: batch[idx]!.text,
        documentId,
        metadata: node.metadata,
      })),
    );
  }

  return { tokens: results.usage.tokens };
};

export const processDocument = schemaTask({
  id: TRIGGER_DOCUMENT_JOB_ID,
  maxDuration: 60 * 60, // 1 hour
  queue: {
    concurrencyLimit: 90,
  },
  retry: {
    maxAttempts: 1,
  },
  schema: triggerDocumentJobBodySchema,
  onFailure: async ({ payload, error }) => {
    const db = getDb();

    const errorMessage =
      (error instanceof Error ? error.message : null) || "Unknown error";

    try {
      await db.document.update({
        where: { id: payload.documentId },
        data: {
          status: DocumentStatus.FAILED,
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

    // Get embedding model and vector store
    const [embeddingModel, vectorStore] = await Promise.all([
      getNamespaceEmbeddingModel(ingestJob.namespace, "document"),
      getNamespaceVectorStore(ingestJob.namespace, document.tenantId),
    ]);

    const keywordStore = ingestJob.namespace.keywordEnabled
      ? new KeywordStore(ingestJob.namespace.id, document.tenantId)
      : null;

    // Clean up existing chunks if requested
    if (shouldCleanup) {
      // pinecone has a limit of 5 requests per second per namespace
      const provider = ingestJob.namespace.vectorStoreConfig?.provider;
      if (
        provider === "MANAGED_PINECONE" ||
        provider === "MANAGED_PINECONE_OLD" ||
        provider === "PINECONE"
      ) {
        await rateLimit(
          {
            queue: "process-document-cleanup",
            concurrencyKey: document.tenantId
              ? `${ingestJob.namespace.id}:${document.tenantId}`
              : ingestJob.namespace.id,
          },
          Ratelimit.tokenBucket(5, "1s", 5),
        );
      }

      await vectorStore.deleteByFilter({
        documentId: document.id,
      });

      // Clean up keyword store if enabled
      if (keywordStore) {
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

    let totalPages = 0;
    let totalTokens = 0;
    let totalChunks = 0;

    if (
      document.source.type === "CRAWLED_PAGE" ||
      document.source.type === "YOUTUBE_VIDEO"
    ) {
      // get document json from s3
      const documentJson = await getChunksJsonFromS3<
        CrawlPartitionResultDocument | YoutubePartitionResultDocument
      >(ingestJob.namespace.id, document.id);

      if (!documentJson) {
        throw new Error("Document JSON not found");
      }

      const newDocumentFields: Prisma.DocumentUpdateInput = {};
      if ("video_metadata" in documentJson) {
        newDocumentFields.source = {
          ...document.source,
          duration: documentJson.video_metadata.duration,
        } as Extract<PrismaJson.DocumentSource, { type: "YOUTUBE_VIDEO" }>;
      } else {
        newDocumentFields.source = {
          ...document.source,
          title: documentJson.page_metadata.title,
          description: documentJson.page_metadata.description,
          language: documentJson.page_metadata.language,
        } as Extract<PrismaJson.DocumentSource, { type: "CRAWLED_PAGE" }>;
      }

      await db.document.update({
        where: { id: document.id },
        data: {
          status: DocumentStatus.PROCESSING,
          processingAt: new Date(),
          ...newDocumentFields,
        },
        select: { id: true },
      });

      totalPages = document.totalPages;
      totalChunks = documentJson.total_chunks;

      const batches = chunkArray(documentJson.chunks, BATCH_SIZE);
      for (const batch of batches) {
        const { tokens } = await processBatch(batch, {
          embeddingModel,
          vectorStore,
          keywordStore,
          documentId: document.id,
          extraMetadata: {
            ...("video_metadata" in documentJson
              ? {
                  video_id: documentJson.video_metadata.video_id,
                  title: documentJson.video_metadata.title,
                  description: documentJson.video_metadata.description,
                  duration: documentJson.video_metadata.duration,
                  timestamp: documentJson.video_metadata.timestamp,
                }
              : {
                  url: documentJson.url,
                  ...documentJson.page_metadata,
                }),
            ...ingestJob.config?.metadata,
          },
        });

        totalTokens += tokens;
      }
    } else {
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
      const partitionBody = await getPartitionDocumentBody({
        document: document as any,
        ingestJobConfig: ingestJob.config,
        namespaceId: ingestJob.namespace.id,
        triggerTokenId: token.id,
        triggerAccessToken: token.publicAccessToken,
      });

      // Partition the document
      const response = await fetch(`${env.PARTITION_API_URL}/ingest`, {
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
      totalPages =
        result.total_pages && typeof result.total_pages === "number"
          ? result.total_pages
          : result.total_characters / 1000;
      totalChunks = result.total_chunks;

      await db.document.update({
        where: { id: document.id },
        data: {
          status: DocumentStatus.PROCESSING,
          processingAt: new Date(),
          totalCharacters: result.total_characters,
          totalChunks,
          totalPages,
          documentProperties: {
            fileSize: result.metadata.size_in_bytes,
            mimeType: result.metadata.filetype,
          },
        },
        select: { id: true },
      });

      // Process all batches and embed chunks
      for (let batchIdx = 0; batchIdx < result.total_batches; batchIdx++) {
        const chunkBatch = await redis.get<PartitionBatch>(
          result.batch_template.replace("[BATCH_INDEX]", batchIdx.toString()),
        );

        if (!chunkBatch) {
          throw new Error("Chunk batch not found");
        }

        const { tokens } = await processBatch(chunkBatch, {
          embeddingModel,
          vectorStore,
          keywordStore,
          documentId: document.id,
          extraMetadata: partitionBody.extra_metadata,
        });

        totalTokens += tokens;
      }

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
      totalChunks,
      meterSuccess,
      pagesDelta: shouldCleanup ? delta : totalPages,
    };
  },
});
