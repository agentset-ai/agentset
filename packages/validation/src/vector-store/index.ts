import { z } from "zod/v4";

import { PineconeVectorStoreConfigSchema } from "./pinecone";
import { TurbopufferVectorStoreConfigSchema } from "./turbopuffer";

export const VectorStoreSchema = z
  .discriminatedUnion("provider", [
    PineconeVectorStoreConfigSchema,
    TurbopufferVectorStoreConfigSchema,
  ])
  .meta({
    id: "vector-store-config",
    description:
      "The vector store config. If not provided, our managed vector store will be used. Note: You can't change the vector store config after the namespace is created.",
  });

export type VectorStoreConfig = z.infer<typeof VectorStoreSchema>;

export { PineconeVectorStoreConfigSchema } from "./pinecone";
