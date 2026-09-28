import { AgentsetApiError } from "@/lib/api/errors";

import type {
  CreateVectorStoreConfig,
  EmbeddingConfig,
} from "@agentset/validation";
import { db } from "@agentset/db/client";
import { isEuRegion } from "@agentset/utils";
import {
  BYO_VECTOR_STORE_REQUIRED_MESSAGE,
  getEmbeddingRegionIssue,
  getVectorStoreRegionIssue,
} from "@agentset/validation";

// EU namespaces must bring their own vector store
const getEuNamespaceConfig = ({
  embeddingConfig,
  vectorStoreConfig,
}: {
  embeddingConfig?: EmbeddingConfig;
  vectorStoreConfig?: CreateVectorStoreConfig;
}) => {
  const issue = !vectorStoreConfig
    ? BYO_VECTOR_STORE_REQUIRED_MESSAGE
    : (getVectorStoreRegionIssue(vectorStoreConfig)?.message ??
      (embeddingConfig && getEmbeddingRegionIssue(embeddingConfig)));

  if (issue) {
    throw new AgentsetApiError({ code: "bad_request", message: issue });
  }

  return { embeddingConfig, vectorStoreConfig };
};

export const createNamespace = async ({
  name,
  organizationId,
  slug,
  embeddingConfig,
  vectorStoreConfig,
}: {
  name: string;
  slug: string;
  organizationId: string;
  embeddingConfig?: EmbeddingConfig;
  vectorStoreConfig?: CreateVectorStoreConfig;
}) => {
  // EU re-checks the configs server-side and saves them; US is unchanged
  const regionConfig = isEuRegion
    ? getEuNamespaceConfig({ embeddingConfig, vectorStoreConfig })
    : {};

  const namespace = await db.namespace.create({
    data: { name, slug, organizationId, ...regionConfig },
  });

  return namespace;
};
