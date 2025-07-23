import { env } from "@/env";

import { db } from "@agentset/db";
import { getNamespaceVectorStore, KeywordStore } from "@agentset/engine";
import { deleteAsset, deleteObject } from "@agentset/storage";
import { chunkArray } from "@agentset/utils";

const slugs = [
  "essays",
  "poc",
  "chat-with-wisdom",
  "poc-2",
  "poc-5",
  "poc-4",
  "poc-final",
  "pulse",
  "masterclass",
  "poc-new",
];

const namespaces = await db.namespace.findMany({
  where: {
    slug: {
      in: slugs,
    },
  },
  select: {
    id: true,
    vectorStoreConfig: true,
    createdAt: true,
    keywordEnabled: true,
    hosting: {
      select: {
        id: true,
        logo: true,
      },
    },
  },
});

let count = 0;
for (const namespace of namespaces) {
  console.log(
    `------ DELETING NAMESPACE ${++count} / ${namespaces.length} ------`,
  );

  const logo = namespace.hosting?.logo;
  if (logo) {
    await deleteAsset(logo.replace(`${env.ASSETS_S3_URL}/`, ""));
  }

  const documents = await db.document.findMany({
    where: {
      ingestJob: {
        namespaceId: namespace.id,
      },
    },
    select: {
      id: true,
      tenantId: true,
      source: true,
      totalCharacters: true,
    },
  });

  let documentIds = [];
  let deletedDocuments = 0;
  for (const document of documents) {
    console.log(
      `Deleting document ${++deletedDocuments} / ${documents.length}...`,
    );

    if (document.source.type === "MANAGED_FILE") {
      console.log("Deleting managed file...");
      await deleteObject(document.source.key);
    }

    if (document.totalCharacters > 0) {
      const vectorStore = await getNamespaceVectorStore(
        namespace,
        document.tenantId ?? undefined,
      );

      let paginationToken: string | undefined;
      const vectorChunkIds: string[] = [];
      console.log("Listing vector store chunks...");
      do {
        const chunks = await vectorStore.list({
          prefix: `${document.id}#`,
          paginationToken,
        });

        chunks.vectors?.forEach((chunk) => {
          if (chunk.id) {
            vectorChunkIds.push(chunk.id);
          }
        });

        paginationToken = chunks.pagination?.next;
      } while (paginationToken);

      const batches = chunkArray(vectorChunkIds, 30);
      console.log("Deleting vector store chunks...");
      for (const batch of batches) {
        await vectorStore.delete(batch);
      }

      if (namespace.keywordEnabled) {
        console.log("Listing keyword store chunks...");
        const keywordStore = new KeywordStore(
          namespace.id,
          document.tenantId ?? undefined,
        );

        let page: number = 1;
        let hasNextPage: boolean = true;
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

        const batches = chunkArray(keywordChunkIds, 30);
        console.log("Deleting keyword store chunks...");
        for (const batch of batches) {
          await keywordStore.deleteByIds(batch);
        }
      }
    }

    documentIds.push(document.id);

    if (documentIds.length >= 40) {
      console.log("Deleting documents...");
      await db.document.deleteMany({
        where: {
          id: { in: documentIds },
        },
      });
      documentIds = [];
    }
  }

  if (documentIds.length > 0) {
    console.log("Deleting documents...");
    await db.document.deleteMany({
      where: {
        id: { in: documentIds },
      },
    });
  }

  // delete namespace
  await db.namespace.delete({
    where: {
      id: namespace.id,
    },
  });
}
console.log("done");
