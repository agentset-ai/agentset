import { schemaTask } from "@trigger.dev/sdk";

import { DocumentStatus } from "@agentset/db";
import { getNamespaceVectorStore, KeywordStore } from "@agentset/engine";
import { deleteObject } from "@agentset/storage";
import { chunkArray } from "@agentset/utils";

import { DELETE_DOCUMENT_JOB_ID, deleteDocumentBodySchema } from "../index";
import { getDb } from "./db";

const BATCH_SIZE = 50;

export const deleteDocument = schemaTask({
  id: DELETE_DOCUMENT_JOB_ID,
  maxDuration: 60 * 30, // 30 minutes
  queue: {
    concurrencyLimit: 50,
  },
  schema: deleteDocumentBodySchema,
  run: async ({ documentId }) => {
    const db = getDb();

    // Get document data
    const document = await db.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        tenantId: true,
        source: true,
        totalPages: true,
        ingestJob: {
          select: {
            namespace: {
              select: {
                id: true,
                vectorStoreConfig: true,
                keywordEnabled: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      return {
        documentId,
        deleted: false,
        reason: "Document not found",
      };
    }

    const namespace = document.ingestJob.namespace;

    // Update status to deleting
    await db.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.DELETING,
      },
      select: {},
    });

    // Get vector store and clean up chunks
    const vectorStore = await getNamespaceVectorStore(
      namespace,
      document.tenantId ?? undefined,
    );

    // Get vector store chunk IDs to delete
    let paginationToken: string | undefined;
    const chunkIdsToDelete: string[] = [];

    do {
      const chunks = await vectorStore.list({
        prefix: `${document.id}#`,
        paginationToken,
      });

      chunks.vectors?.forEach((chunk) => {
        if (chunk.id) {
          chunkIdsToDelete.push(chunk.id);
        }
      });

      paginationToken = chunks.pagination?.next;
    } while (paginationToken);

    // Delete vector store chunks
    if (chunkIdsToDelete.length > 0) {
      const batches = chunkArray(chunkIdsToDelete, BATCH_SIZE);
      for (const batch of batches) {
        await vectorStore.delete(batch);
      }
    }

    // Clean up keyword store if enabled
    if (namespace.keywordEnabled) {
      const keywordStore = new KeywordStore(
        namespace.id,
        document.tenantId ?? undefined,
      );

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

    // Delete managed file if needed
    if (document.source.type === "MANAGED_FILE") {
      await deleteObject(document.source.key);
    }

    // Delete document and update counters
    await db.$transaction([
      db.document.delete({
        where: { id: document.id },
        select: {},
      }),
      db.namespace.update({
        where: { id: namespace.id },
        data: {
          totalDocuments: { decrement: 1 },
          totalPages: { decrement: document.totalPages },
          organization: {
            update: {
              totalDocuments: { decrement: 1 },
              totalPages: { decrement: document.totalPages },
            },
          },
        },
        select: {},
      }),
    ]);

    return {
      documentId: document.id,
      deleted: true,
      vectorChunksDeleted: chunkIdsToDelete.length,
    };
  },
});
