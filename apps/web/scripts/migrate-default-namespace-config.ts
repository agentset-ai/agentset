import { db, Prisma } from "@agentset/db";

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
for (const namespace of namespacesWithDefaultConfig) {
  console.log(
    `[${++i} / ${namespacesWithDefaultConfig.length}] Migrating namespace ${namespace.id}`,
  );

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

  await db.namespace.update({
    where: { id: namespace.id },
    data: {
      ...(newVectorConfig ? { vectorStoreConfig: newVectorConfig } : {}),
      ...(newEmbeddingConfig ? { embeddingConfig: newEmbeddingConfig } : {}),
    },
  });
}

console.log("Done!");
