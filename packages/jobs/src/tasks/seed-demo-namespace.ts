import { schemaTask } from "@trigger.dev/sdk";

import type { PartitionBatch } from "@agentset/engine";
import { DocumentStatus, IngestJobStatus, NamespaceStatus } from "@agentset/db";
import { getDemoTemplate } from "@agentset/demo";
import { getNamespaceVectorStore } from "@agentset/engine";
import { makeChunksKey, uploadObject } from "@agentset/storage";
import { chunkArray } from "@agentset/utils";

import { getDb } from "../db";
import {
  SEED_DEMO_NAMESPACE_JOB_ID,
  seedDemoNamespaceBodySchema,
} from "../schema";

const UPSERT_BATCH_SIZE = 30;

type DemoSeedDocument = {
  metadata: {
    filename: string;
    namespaceId: string; // will be {NAMESPACE_ID}
    documentId: string; // will be {DOCUMENT_ID}
  };
  total_characters: number;
  total_chunks: number;
  document_properties: { fileSize: number; mimeType: string };
  total_tokens: number;
  total_pages?: number;
  chunks: (PartitionBatch[number] & { embedding: number[] })[];
};

const getDocumentPages = (document: DemoSeedDocument) => {
  if (document.total_pages) return document.total_pages;
  return document.total_characters / 1000;
};

const uploadChunksFile = async (
  document: DemoSeedDocument,
  namespaceId: string,
  documentId: string,
) => {
  const key = makeChunksKey(namespaceId, documentId);
  const chunksFile = JSON.stringify({
    ...document,
    total_pages: undefined,
    total_tokens: undefined,
    document_properties: undefined,
    metadata: {
      ...document.metadata,
      namespaceId,
      documentId,
    },
    chunks: document.chunks.map((chunk) => ({
      ...chunk,
      embedding: undefined,
    })),
  });
  await uploadObject(key, chunksFile);
};

export const seedDemoNamespace = schemaTask({
  id: SEED_DEMO_NAMESPACE_JOB_ID,
  maxDuration: 60 * 5, // 5 minutes
  queue: {
    concurrencyLimit: 90,
  },
  retry: {
    maxAttempts: 1,
  },
  schema: seedDemoNamespaceBodySchema,
  run: async ({ namespaceId, organizationId, templateId }) => {
    const template = getDemoTemplate(templateId);
    if (!template) throw new Error("Template not found");

    const db = getDb();
    const namespace = await db.namespace.findFirst({
      where: {
        id: namespaceId,
        organizationId,
        status: NamespaceStatus.ACTIVE,
      },
      select: {
        id: true,
        demoId: true,
        vectorStoreConfig: true,
        organizationId: true,
      },
    });

    if (!namespace) throw new Error("Namespace not found");

    const vectorStore = await getNamespaceVectorStore(namespace);
    const [ingestJob] = await db.$transaction([
      db.ingestJob.create({
        data: {
          namespaceId: namespace.id,
          status: IngestJobStatus.PROCESSING,
          name: template.name,
          payload: template.ingestJob,
          queuedAt: new Date(),
          processingAt: new Date(),
        },
        select: { id: true },
      }),
      db.namespace.update({
        where: { id: namespace.id },
        data: {
          totalIngestJobs: { increment: 1 },
        },
        select: { id: true },
      }),
      db.organization.update({
        where: { id: namespace.organizationId },
        data: {
          totalIngestJobs: { increment: 1 },
        },
        select: { id: true },
      }),
    ]);

    let totalDocuments = 0;
    let totalPages = 0;

    try {
      for (const seededDocument of template.ingestJob.items) {
        // replace extension with -chunks.json
        const chunksUrl = seededDocument.fileUrl.replace(
          /\.[^/.]+$/,
          "-chunks.json",
        );

        const chunksFile = (await (
          await fetch(chunksUrl)
        ).json()) as DemoSeedDocument;
        const totalDocumentPages = getDocumentPages(chunksFile);

        const document = await db.document.create({
          data: {
            name: seededDocument.fileName,
            source: {
              type: "FILE",
              fileUrl: seededDocument.fileUrl,
            },
            namespaceId: namespace.id,
            ingestJobId: ingestJob.id,
            status: DocumentStatus.PROCESSING,
            totalCharacters: chunksFile.total_characters,
            totalChunks: chunksFile.total_chunks,
            totalTokens: chunksFile.total_tokens,
            totalPages: totalDocumentPages,
            documentProperties: chunksFile.document_properties,
            queuedAt: new Date(),
            processingAt: new Date(),
          },
          select: { id: true },
        });

        const vectorChunks = chunksFile.chunks.map((chunk) => {
          return {
            documentId: document.id,
            chunk: {
              id: chunk.id,
              text: chunk.text,
              metadata: {
                ...chunksFile.metadata,
                documentId: document.id,
                namespaceId: namespace.id,
                ...chunk.metadata,
              },
            },
            embedding: chunk.embedding,
          };
        });

        for (const batch of chunkArray(vectorChunks, UPSERT_BATCH_SIZE)) {
          await vectorStore.upsert({ chunks: batch });
        }

        // allow users to view the chunks file in the UI
        await uploadChunksFile(chunksFile, namespace.id, document.id);

        await db.document.update({
          where: { id: document.id },
          data: {
            status: DocumentStatus.COMPLETED,
            completedAt: new Date(),
          },
          select: { id: true },
        });

        totalDocuments += 1;
        totalPages += totalDocumentPages;
      }

      await db.$transaction([
        db.ingestJob.update({
          where: { id: ingestJob.id },
          data: {
            status: IngestJobStatus.COMPLETED,
            completedAt: new Date(),
          },
          select: { id: true },
        }),
        db.namespace.update({
          where: { id: namespace.id },
          data: {
            totalDocuments: { increment: totalDocuments },
            totalPages: { increment: totalPages },
          },
          select: { id: true },
        }),
        db.organization.update({
          where: { id: namespace.organizationId },
          data: {
            totalDocuments: { increment: totalDocuments },
            totalPages: { increment: totalPages },
          },
          select: { id: true },
        }),
      ]);

      return {
        namespaceId,
        organizationId,
        templateId,
        ingestJobId: ingestJob.id,
        totalDocuments,
        totalPages,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await db.ingestJob.update({
        where: { id: ingestJob.id },
        data: {
          status: IngestJobStatus.FAILED,
          error: errorMessage,
          failedAt: new Date(),
        },
        select: { id: true },
      });

      throw error;
    }
  },
});
