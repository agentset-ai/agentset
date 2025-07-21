import type { TriggerDocumentJobBody } from "@/lib/workflow";
import type { WorkflowContext } from "@upstash/workflow";
import { env } from "@/env";
import { prefixId } from "@/lib/api/ids";
import { redis } from "@/lib/redis";
import { qstashClient, qstashReceiver } from "@/lib/workflow";
import { serve } from "@upstash/workflow/nextjs";
import { embedMany } from "ai";

import type {
  PartitionBatch,
  PartitionBody,
  PartitionResult,
} from "@agentset/engine";
import { db, DocumentStatus, IngestJobStatus } from "@agentset/db";
import {
  getNamespaceEmbeddingModel,
  getNamespaceVectorStore,
  getPartitionDocumentBody,
  KeywordStore,
  makeChunk,
} from "@agentset/engine";
import { isProPlan, meterIngestedPages } from "@agentset/stripe";
import { chunkArray } from "@agentset/utils";

const BATCH_SIZE = 30;

const updateDocumentStatusFailed = async (
  documentId: string,
  error?: string,
) => {
  await db.document.update({
    where: { id: documentId },
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
};

const handleDocumentError = async (
  documentId: string,
  error?: string,
  context?: WorkflowContext<TriggerDocumentJobBody>,
) => {
  if (context) {
    return context.run("update-document-status-failed", async () => {
      await updateDocumentStatusFailed(documentId, error);
    });
  }

  await updateDocumentStatusFailed(documentId, error);
};

const partitionDocument = async (
  partitionBody: PartitionBody,
  context: WorkflowContext<TriggerDocumentJobBody>,
) => {
  const { body, status } = await context.call<{ call_id: string } | undefined>(
    "partition-document",
    {
      url: env.PARTITION_API_URL,
      method: "POST",
      headers: {
        "api-key": env.PARTITION_API_KEY,
      },
      body: partitionBody,
    },
  );

  if (status !== 200 || !body?.call_id) {
    return {
      result: null,
      error: "Partition error",
    };
  }

  // Step 2: Wait for the document to be processed
  const { eventData, timeout } = await context.waitForEvent(
    "wait-for-partition-processing",
    partitionBody.notify_id,
    {
      timeout: "1d", // 1 day timeout
    },
  );

  const typedData = eventData as PartitionResult | undefined;
  if (timeout || !typedData || typedData.status !== 200) {
    return {
      result: null,
      error: "Partition error",
    };
  }

  return {
    result: typedData,
    error: null,
  } as const;
};

export const { POST } = serve<TriggerDocumentJobBody>(
  async (context) => {
    const {
      ingestJob: { namespace, ...ingestJob },
      shouldCleanup,
      ...document
    } = await context.run("get-config", async () => {
      const { documentId } = context.requestPayload;
      const doc = await db.document.findUnique({
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

      if (!doc) {
        throw new Error("Ingestion job not found");
      }

      return { ...doc, shouldCleanup: context.requestPayload.cleanup };
    });

    await context.run("update-status-pre-processing", async () => {
      await db.document.update({
        where: { id: document.id },
        data: {
          status: DocumentStatus.PRE_PROCESSING,
          preProcessingAt: new Date(),
        },
        select: { id: true },
      });
    });

    const partitionBody = await context.run(
      "get-partition-document-body",
      async () => {
        return await getPartitionDocumentBody(document, ingestJob, namespace);
      },
    );

    const { result: body, error } = await partitionDocument(
      partitionBody,
      context,
    );

    if (error || !body) {
      await handleDocumentError(document.id, error, context);
      return;
    }

    // change status to processing
    const { totalPages } = await context.run(
      "update-document-properties-and-status-processing",
      async () => {
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
            // totalTokens: body.total_tokens,
            documentProperties: {
              fileSize: body.metadata.sizeInBytes,
              mimeType: body.metadata.filetype,
            },
          },
          select: { id: true },
        });

        return { totalPages };
      },
    );

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
      const chunkIdsToDelete = await context.run(
        "cleanup-get-vector-store-chunk-ids",
        async () => {
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

          return chunkIds;
        },
      );

      await context.run("cleanup-vector-store-chunks", async () => {
        if (chunkIdsToDelete.length === 0) return;

        const batches = chunkArray(chunkIdsToDelete, BATCH_SIZE);
        for (const batch of batches) {
          await vectorStore.delete(batch);
        }
      });

      if (namespace.keywordEnabled) {
        // cleanup keyword store
        const keywordChunkIdsToDelete = await context.run(
          "cleanup-get-keyword-store-chunk-ids",
          async () => {
            let page: number = 1;
            let hasNextPage: boolean = true;
            const chunkIds: string[] = [];

            do {
              const chunks = await keywordStore.listIds({
                documentId: document.id,
                page,
              });

              chunkIds.push(...chunks.ids);

              hasNextPage = chunks.hasNextPage;
              page = chunks.currentPage + 1;
            } while (hasNextPage);

            return chunkIds;
          },
        );

        await context.run("cleanup-keyword-store-chunks", async () => {
          if (keywordChunkIdsToDelete.length === 0) return;

          const batches = chunkArray(keywordChunkIdsToDelete, BATCH_SIZE);
          for (const batch of batches) {
            await keywordStore.deleteByIds(batch);
          }
        });
      }
    }

    let totalTokens = 0;
    for (let batchIdx = 0; batchIdx < body.total_batches; batchIdx++) {
      const tokens = await context.run(`embed-batch-${batchIdx}`, async () => {
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

        await vectorStore.upsert(nodes);

        if (namespace.keywordEnabled) {
          // store in keyword store
          await keywordStore.upsert(
            nodes.map((node, idx) => ({
              id: node.id,
              text: chunkBatch[idx]!.text,
              documentId: document.id,
              metadata: node.metadata,
            })),
          );
        }

        return results.usage.tokens;
      });

      totalTokens += tokens;
    }

    await context.run("update-status-completed", async () => {
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
        // update namespace + organization total pages
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
    });

    await context.run("check-and-update-ingestion-job-status", async () => {
      const uncompletedDocument = await db.document.findFirst({
        where: {
          ingestJob: { id: ingestJob.id },
          status: { not: DocumentStatus.COMPLETED },
        },
        select: { id: true },
      });

      if (!uncompletedDocument) {
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
      }
    });

    // delete all chunks from redis
    await context.run("delete-chunks-from-redis", async () => {
      const keys = new Array(body.total_batches)
        .fill(null)
        .map((_, idx) =>
          body.batch_template.replace("[BATCH_INDEX]", idx.toString()),
        );

      const keyBatches = chunkArray(keys, 150);
      for (const keyBatch of keyBatches) {
        await redis.del(...keyBatch);
      }
    });

    // log usage to stripe
    const stripeCustomerId = namespace.organization.stripeId;
    if (
      isProPlan(namespace.organization.plan) &&
      !!stripeCustomerId &&
      !shouldCleanup // don't log usage if re-processing
    ) {
      await context.run("log-usage-to-stripe", async () => {
        await meterIngestedPages({
          documentId: prefixId(document.id, "doc_"),
          totalPages,
          stripeCustomerId,
        });
      });
    }
  },
  {
    failureFunction: async ({ context, failResponse }) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (context.requestPayload && context.requestPayload.documentId) {
        const { documentId } = context.requestPayload;
        await handleDocumentError(documentId, failResponse);
      }
    },
    qstashClient: qstashClient,
    receiver: qstashReceiver,
    flowControl: {
      key: "process-document",
      parallelism: 150,
      rate: 60,
      period: "3s",
    },
  },
);
