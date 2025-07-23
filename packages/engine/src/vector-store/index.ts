import type { Namespace } from "@agentset/db";

import { env } from "../env";

export const getNamespaceVectorStore = async (
  namespace: Pick<Namespace, "vectorStoreConfig" | "id" | "createdAt">,
  tenant?: string,
) => {
  const config = namespace.vectorStoreConfig;

  const tenantId = `agentset:${namespace.id}${tenant ? `:${tenant}` : ""}`;

  // TODO: handle different embedding models
  if (!config) {
    const { Pinecone } = await import("./pinecone");
    const shouldUseSecondary =
      namespace.createdAt &&
      (typeof namespace.createdAt === "string"
        ? new Date(namespace.createdAt)
        : namespace.createdAt
      ).getTime() > 1747418241190 &&
      !!env.SECONDARY_PINECONE_API_KEY &&
      !!env.SECONDARY_PINECONE_HOST;

    return new Pinecone({
      apiKey: shouldUseSecondary
        ? env.SECONDARY_PINECONE_API_KEY!
        : env.DEFAULT_PINECONE_API_KEY,
      indexHost: shouldUseSecondary
        ? env.SECONDARY_PINECONE_HOST!
        : env.DEFAULT_PINECONE_HOST,
      namespace: tenantId,
    });
  }

  switch (config.provider) {
    case "PINECONE": {
      const { Pinecone } = await import("./pinecone");
      const { apiKey, indexHost } = config;
      return new Pinecone({ apiKey, indexHost, namespace: tenantId });
    }

    default: {
      // This exhaustive check ensures TypeScript will error if a new provider
      // is added without handling it in the switch statement
      const _exhaustiveCheck: never = config.provider;
      throw new Error(`Unknown vector store provider: ${_exhaustiveCheck}`);
    }
  }
};

export { queryVectorStore } from "./parse";
