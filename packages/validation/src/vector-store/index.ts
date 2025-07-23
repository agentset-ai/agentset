import { z } from "zod/v4";

import { PineconeVectorStoreConfigSchema } from "./pinecone";

export const VectorStoreSchema = z
  .discriminatedUnion("provider", [PineconeVectorStoreConfigSchema])
  .describe(
    "The vector store config. If not provided, our managed vector store will be used. Note: You can't change the vector store config after the namespace is created.",
  );

export type VectorStoreConfig = z.infer<typeof VectorStoreSchema>;

export { PineconeVectorStoreConfigSchema } from "./pinecone";
