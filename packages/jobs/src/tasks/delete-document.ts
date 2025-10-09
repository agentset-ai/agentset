import { schemaTask } from "@trigger.dev/sdk";

import { DocumentStatus } from "@agentset/db";
import { getNamespaceVectorStore, KeywordStore } from "@agentset/engine";
import { deleteObject } from "@agentset/storage";
import { chunkArray } from "@agentset/utils";

import { getDb } from "../db";
import { DELETE_DOCUMENT_JOB_ID, deleteDocumentBodySchema } from "../schema";

const BATCH_SIZE = 50;

export const deleteDocument = schemaTask({
  id: DELETE_DOCUMENT_JOB_ID,
  maxDuration: 60 * 30, // 30 minutes
  queue: {
    concurrencyLimit: 90,
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
        namespace: {
          select: {
            id: true,
            vectorStoreConfig: true,
            keywordEnabled: true,
          },
        },
      },
    });

    if (!document) {
      return {
        documentId,
        deleted: false as const,
        reason: "Document not found",
      };
    }

    const namespace = document.namespace!;

    // Update status to deleting
    await db.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.DELETING,
      },
      select: { id: true },
    });

    // Get vector store and clean up chunks
    const vectorStore = await getNamespaceVectorStore(
      namespace,
      document.tenantId,
    );

    const deletedChunks = await vectorStore.deleteByFilter({
      documentId: document.id,
    });

    // Clean up keyword store if enabled
    if (namespace.keywordEnabled) {
      const keywordStore = new KeywordStore(namespace.id, document.tenantId);

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
    await db.document.delete({
      where: { id: document.id },
      select: { id: true },
    });

    return {
      documentId: document.id,
      deleted: true as const,
      vectorChunksDeleted: deletedChunks.deleted,
      pagesDeleted: document.totalPages,
    };
  },
});
