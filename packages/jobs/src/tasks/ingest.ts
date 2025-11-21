import { schemaTask, wait } from "@trigger.dev/sdk";

import type {
  CrawlPartitionBody,
  CrawlPartitionResult,
} from "@agentset/engine";
import { DocumentStatus, IngestJobStatus, Prisma } from "@agentset/db";
import { env } from "@agentset/engine/env";
import { chunkArray } from "@agentset/utils";

import { getDb } from "../db";
import {
  TRIGGER_INGESTION_JOB_ID,
  triggerIngestionJobBodySchema,
} from "../schema";
import { processDocument } from "./process-document";

const BATCH_SIZE = 30;

export const ingestJob = schemaTask({
  id: TRIGGER_INGESTION_JOB_ID,
  maxDuration: 60 * 60 * 12, // 12 hours
  queue: {
    concurrencyLimit: 90,
  },
  retry: {
    maxAttempts: 1,
  },
  schema: triggerIngestionJobBodySchema,
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
      ) {
        return;
      }

      throw e;
    }
  },
  run: async ({ jobId }, { ctx }) => {
    const db = getDb();

    // Get ingestion job configuration
    const ingestionJob = await db.ingestJob.findUnique({
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
      namespaceId: ingestionJob.namespace.id,
    } satisfies Partial<Prisma.DocumentCreateArgs["data"]>;

    let documentsIds: string[] = [];

    if (ingestionJob.payload.type === "CRAWL") {
      const token = await wait.createToken({ timeout: "2h" });

      const body: CrawlPartitionBody = {
        url: ingestionJob.payload.url,
        extra_metadata: ingestionJob.config?.metadata,
        crawl_options: {
          max_depth: ingestionJob.payload.options?.maxDepth,
          limit: ingestionJob.payload.options?.limit,
          exclude_paths: ingestionJob.payload.options?.excludePaths,
          include_paths: ingestionJob.payload.options?.includePaths,
          headers: ingestionJob.payload.options?.headers,
        },
        chunk_options: {
          chunk_size: ingestionJob.config?.chunkSize,
        },
        trigger_token_id: token.id,
        trigger_access_token: token.publicAccessToken,
        namespace_id: ingestionJob.namespace.id,
      };

      const response = await fetch(`${env.PARTITION_API_URL}/crawl`, {
        method: "POST",
        headers: {
          "api-key": env.PARTITION_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const initialBody = (await response.json()) as { call_id: string };
      if (response.status !== 200 || !initialBody.call_id) {
        throw new Error("Partition Error");
      }

      const result = await wait
        .forToken<CrawlPartitionResult | undefined>(token.id)
        .unwrap();

      if (!result || result.status !== 200) {
        throw new Error("Partition Error");
      }

      const batchDocuments = chunkArray(result.documents, 20);
      for (const batch of batchDocuments) {
        const batchDocuments = await db.document.createManyAndReturn({
          select: { id: true },
          data: batch.map((doc) => ({
            ...commonData,
            id: doc.id,
            status: DocumentStatus.QUEUED,
            name: doc.url,
            source: {
              type: "CRAWLED_PAGE",
            },
            totalCharacters: doc.total_characters,
            totalChunks: doc.total_chunks,
            totalPages: doc.total_characters / 1000,
            documentProperties: {
              fileSize: doc.total_bytes,
              mimeType: "text/html",
            },
          })),
        });

        documentsIds = documentsIds.concat(batchDocuments.map((doc) => doc.id));
      }
    } else if (
      ingestionJob.payload.type === "FILE" ||
      ingestionJob.payload.type === "TEXT" ||
      ingestionJob.payload.type === "MANAGED_FILE"
    ) {
      const commonDocumentData = {
        name: ingestionJob.payload.fileName,
        // TODO: bring this back when we implement document external ID
        // externalId: ingestionJob.payload.externalId,
      };

      // Handle single document types
      if (ingestionJob.payload.type === "TEXT") {
        const { text } = ingestionJob.payload;
        const document = await db.document.create({
          data: {
            ...commonData,
            ...commonDocumentData,
            source: {
              type: "TEXT",
              text,
            },
            totalCharacters: text.length,
          },
          select: { id: true },
        });

        documentsIds = [document.id];
      } else if (ingestionJob.payload.type === "FILE") {
        const { fileUrl } = ingestionJob.payload;
        const document = await db.document.create({
          data: {
            ...commonData,
            ...commonDocumentData,
            source: {
              type: "FILE",
              fileUrl: fileUrl,
            },
          },
          select: { id: true },
        });

        documentsIds = [document.id];
      } else if (ingestionJob.payload.type === "MANAGED_FILE") {
        const { key } = ingestionJob.payload;
        const document = await db.document.create({
          data: {
            ...commonData,
            ...commonDocumentData,
            source: {
              type: "MANAGED_FILE",
              key: key,
            },
          },
          select: { id: true },
        });

        documentsIds = [document.id];
      }
    } else {
      // Handle batch document creation for multi-file types
      const batches = chunkArray(ingestionJob.payload.items, 20);

      for (let i = 0; i < batches.length; i++) {
        const fileBatch = batches[i]!;
        const batchResult = await db.document.createManyAndReturn({
          select: { id: true },
          data: fileBatch.map(
            ({
              config,
              fileName,
              // externalId,
              ...file
            }) => ({
              ...commonData,
              // TODO: bring this back when we implement document external ID
              // externalId: file.externalId,
              name: fileName,
              source: file,
              config,
            }),
          ),
        });

        documentsIds = documentsIds.concat(batchResult.map((doc) => doc.id));
      }
    }

    await db.$transaction([
      // Update total documents in namespace + organization
      db.namespace.update({
        where: { id: ingestionJob.namespace.id },
        data: {
          totalDocuments: { increment: documentsIds.length },
        },
        select: { id: true },
      }),
      db.organization.update({
        where: { id: ingestionJob.namespace.organization.id },
        data: {
          totalDocuments: { increment: documentsIds.length },
        },
        select: { id: true },
      }),
      // Update status to processing
      db.ingestJob.update({
        where: { id: ingestionJob.id },
        data: {
          status: IngestJobStatus.PROCESSING,
          processingAt: new Date(),
        },
        select: { id: true },
      }),
    ]);

    const chunks = chunkArray(documentsIds, BATCH_SIZE);
    let success = true;
    let totalPages = 0;
    for (const chunk of chunks) {
      const handles = await processDocument.batchTriggerAndWait(
        chunk.map((documentId) => ({
          payload: {
            documentId: documentId,
            ingestJob: ingestionJob,
          },
          options: {
            tags: [`doc_${documentId}`],
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
        where: { id: ingestionJob.id },
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
        where: { id: ingestionJob.namespace.id },
        data: pagesUpdate,
        select: { id: true },
      }),
      db.organization.update({
        where: { id: ingestionJob.namespace.organization.id },
        data: pagesUpdate,
        select: { id: true },
      }),
    ]);

    return {
      ingestionJobId: ingestionJob.id,
      documentsCreated: documentsIds.length,
    };
  },
});
