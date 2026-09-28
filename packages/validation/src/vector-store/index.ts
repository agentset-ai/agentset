import { z } from "zod/v4";

import {
  EU_TURBOPUFFER_REGIONS,
  isEuRegion,
  REGION_FEATURES,
} from "@agentset/utils";

import { PineconeVectorStoreConfigSchema } from "./pinecone";
import {
  isTurbopufferRegionAvailable,
  TurbopufferVectorStoreConfigSchema,
} from "./turbopuffer";

export { PineconeVectorStoreConfigSchema } from "./pinecone";
export {
  isTurbopufferRegionAvailable,
  TurbopufferVectorStoreConfigSchema,
} from "./turbopuffer";
export type VectorStoreConfig = z.infer<typeof VectorStoreSchema>;
export type CreateVectorStoreConfig = z.infer<typeof createVectorStoreSchema>;

const vectorStores = [
  z.object({ provider: z.literal("MANAGED_PINECONE") }),
  z.object({ provider: z.literal("MANAGED_TURBOPUFFER") }),
  PineconeVectorStoreConfigSchema,
  TurbopufferVectorStoreConfigSchema,
] as const;

export const BYO_VECTOR_STORE_REQUIRED_MESSAGE =
  "EU namespaces need your own Turbopuffer or Pinecone credentials";

const EU_TURBOPUFFER_REGION_MESSAGE = `EU namespaces need a Turbopuffer region in the EU: ${EU_TURBOPUFFER_REGIONS.join(", ")}`;

/**
 * Why a new namespace can't use this vector store config in this region, or
 * `undefined` when it can.
 */
export const getVectorStoreRegionIssue = (
  config: VectorStoreConfig,
): { path: "provider" | "region"; message: string } | undefined => {
  if (
    !REGION_FEATURES.managedVectorStores &&
    config.provider.startsWith("MANAGED_")
  ) {
    return { path: "provider", message: BYO_VECTOR_STORE_REQUIRED_MESSAGE };
  }

  if (
    config.provider === "TURBOPUFFER" &&
    !isTurbopufferRegionAvailable(config.region)
  ) {
    return { path: "region", message: EU_TURBOPUFFER_REGION_MESSAGE };
  }

  return undefined;
};

// This reflects the vector store config that is used to create a namespace
// note that MANAGED_PINECONE_OLD is not included here because it is an internal state
export const createVectorStoreSchema = (
  isEuRegion
    ? z
        .discriminatedUnion("provider", vectorStores, {
          // missing config or unknown provider
          error: BYO_VECTOR_STORE_REQUIRED_MESSAGE,
        })
        .check((ctx) => {
          const issue = getVectorStoreRegionIssue(ctx.value);
          if (issue) {
            ctx.issues.push({
              code: "custom",
              message: issue.message,
              input: ctx.value,
              path: [issue.path],
            });
          }
        })
    : z.discriminatedUnion("provider", vectorStores)
).meta({
  id: "create-vector-store-config",
  description: isEuRegion
    ? "The vector store config: your own Turbopuffer or Pinecone credentials. Note: You can't change the vector store config after the namespace is created."
    : "The vector store config. If not provided, our MANAGED_PINECONE vector store will be used. Note: You can't change the vector store config after the namespace is created.",
});

// This reflects the vector store config that is stored in the database
export const VectorStoreSchema = z
  .discriminatedUnion("provider", [
    z.object({ provider: z.literal("MANAGED_PINECONE_OLD") }),
    ...vectorStores,
  ])
  .meta({
    id: "vector-store-config",
    description: "The vector store config.",
  });
