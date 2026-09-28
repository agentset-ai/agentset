import type { Namespace } from "@agentset/db";
import { REGION_FEATURES } from "@agentset/utils";

import { env } from "../env";
import { ProviderUnavailableError } from "../errors";
import { VectorStore } from "./common/vector-store";

const requireManagedCredential = (value: string | undefined) => {
  if (!REGION_FEATURES.managedVectorStores || !value) {
    throw new ProviderUnavailableError(
      "Managed vector stores are not available in this region",
    );
  }

  return value;
};

export const getNamespaceVectorStore = async (
  namespace: Pick<Namespace, "vectorStoreConfig" | "id">,
  tenant?: string | null,
): Promise<VectorStore> => {
  let config = namespace.vectorStoreConfig;
  const commonConfig = {
    namespaceId: namespace.id,
    tenantId: tenant ?? undefined,
  };

  // TODO: handle different embedding models
  // NOTE: this technically should never happen because we should always have a vector store config
  if (!config) {
    config = {
      provider: "MANAGED_TURBOPUFFER",
    };
  }

  switch (config.provider) {
    case "MANAGED_PINECONE":
    case "MANAGED_PINECONE_OLD":
    case "PINECONE": {
      const { Pinecone } = await import("./pinecone/index");

      let apiKey: string;
      let indexHost: string;

      if (config.provider === "MANAGED_PINECONE_OLD") {
        apiKey = requireManagedCredential(env.DEFAULT_PINECONE_API_KEY);
        indexHost = requireManagedCredential(env.DEFAULT_PINECONE_HOST);
      } else if (config.provider === "MANAGED_PINECONE") {
        apiKey = requireManagedCredential(env.SECONDARY_PINECONE_API_KEY);
        indexHost = requireManagedCredential(env.SECONDARY_PINECONE_HOST);
      } else {
        apiKey = config.apiKey;
        indexHost = config.indexHost;
      }

      return new Pinecone({
        apiKey,
        indexHost,
        ...commonConfig,
      }) as VectorStore;
    }

    case "MANAGED_TURBOPUFFER":
    case "TURBOPUFFER": {
      const { Turbopuffer } = await import("./turbopuffer/index");

      return new Turbopuffer({
        apiKey:
          config.provider === "MANAGED_TURBOPUFFER"
            ? requireManagedCredential(env.DEFAULT_TURBOPUFFER_API_KEY)
            : config.apiKey,
        region:
          config.provider === "MANAGED_TURBOPUFFER"
            ? "aws-us-east-1"
            : config.region,
        ...commonConfig,
      });
    }

    default: {
      // This exhaustive check ensures TypeScript will error if a new provider
      // is added without handling it in the switch statement
      const _exhaustiveCheck: never = config;
      throw new Error(`Unknown vector store provider: ${_exhaustiveCheck}`);
    }
  }
};
