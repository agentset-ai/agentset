import { Prisma } from "@agentset/db";
import { db } from "@agentset/db/client";
import { chunkArray } from "@agentset/utils";

const namespacesWithDefaultConfig = await db.namespace.findMany({
  where: {
    OR: [
      {
        vectorStoreConfig: { equals: Prisma.AnyNull },
      },
      {
        embeddingConfig: { equals: Prisma.AnyNull },
      },
    ],
  },
  select: {
    id: true,
    createdAt: true,
    vectorStoreConfig: true,
    embeddingConfig: true,
  },
});

console.log(
  `Found ${namespacesWithDefaultConfig.length} namespaces with default config`,
);
let i = 0;
const batches = chunkArray(namespacesWithDefaultConfig, 10);
for (const batch of batches) {
  console.log(`[${++i} / ${batches.length}] Migrating batch`);

  const updates = [];
  for (const namespace of batch) {
    if (namespace.vectorStoreConfig && namespace.embeddingConfig) continue;

    let newVectorConfig: PrismaJson.NamespaceVectorStoreConfig | undefined;
    let newEmbeddingConfig: PrismaJson.NamespaceEmbeddingConfig | undefined;

    if (!namespace.vectorStoreConfig) {
      newVectorConfig = {
        provider:
          namespace.createdAt && namespace.createdAt.getTime() > 1747418241190
            ? "MANAGED_PINECONE"
            : "MANAGED_PINECONE_OLD",
      };
    }

    if (!namespace.embeddingConfig) {
      newEmbeddingConfig = {
        provider: "MANAGED_OPENAI",
        model: "text-embedding-3-large",
      };
    }

    updates.push({
      where: { id: namespace.id },
      data: {
        ...(newVectorConfig ? { vectorStoreConfig: newVectorConfig } : {}),
        ...(newEmbeddingConfig ? { embeddingConfig: newEmbeddingConfig } : {}),
      },
    });
  }

  if (updates.length === 0) continue;
  await db.$transaction(updates.map((update) => db.namespace.update(update)));
}

console.log("Done!");
