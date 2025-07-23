import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

export const env = createEnv({
  server: {
    DEFAULT_PINECONE_API_KEY: z.string(),
    DEFAULT_PINECONE_HOST: z.string().url(),

    SECONDARY_PINECONE_API_KEY: z.string().optional(),
    SECONDARY_PINECONE_HOST: z.string().url().optional(),

    AZURE_SEARCH_URL: z.string().url(),
    AZURE_SEARCH_INDEX: z.string(),
    AZURE_SEARCH_KEY: z.string(),

    DEFAULT_AZURE_BASE_URL: z.string().url(),
    DEFAULT_AZURE_API_KEY: z.string(),
    DEFAULT_AZURE_TEXT_3_LARGE_EMBEDDING_DEPLOYMENT: z.string(),
    DEFAULT_AZURE_TEXT_3_LARGE_EMBEDDING_VERSION: z.string().optional(),
    DEFAULT_AZURE_GPT_4_1_DEPLOYMENT: z.string(),
    DEFAULT_AZURE_GPT_4_1_VERSION: z.string().optional(),

    DEFAULT_COHERE_API_KEY: z.string(),

    PARTITION_API_KEY: z.string(),
    PARTITION_API_URL: z.string().url(),
  },
  runtimeEnv: {
    DEFAULT_PINECONE_API_KEY: process.env.DEFAULT_PINECONE_API_KEY,
    DEFAULT_PINECONE_HOST: process.env.DEFAULT_PINECONE_HOST,

    SECONDARY_PINECONE_API_KEY: process.env.SECONDARY_PINECONE_API_KEY,
    SECONDARY_PINECONE_HOST: process.env.SECONDARY_PINECONE_HOST,

    AZURE_SEARCH_URL: process.env.AZURE_SEARCH_URL,
    AZURE_SEARCH_INDEX: process.env.AZURE_SEARCH_INDEX,
    AZURE_SEARCH_KEY: process.env.AZURE_SEARCH_KEY,

    DEFAULT_AZURE_BASE_URL: process.env.DEFAULT_AZURE_BASE_URL,
    DEFAULT_AZURE_API_KEY: process.env.DEFAULT_AZURE_API_KEY,
    DEFAULT_AZURE_TEXT_3_LARGE_EMBEDDING_DEPLOYMENT:
      process.env.DEFAULT_AZURE_TEXT_3_LARGE_EMBEDDING_DEPLOYMENT,
    DEFAULT_AZURE_TEXT_3_LARGE_EMBEDDING_VERSION:
      process.env.DEFAULT_AZURE_TEXT_3_LARGE_EMBEDDING_VERSION,
    DEFAULT_AZURE_GPT_4_1_DEPLOYMENT:
      process.env.DEFAULT_AZURE_GPT_4_1_DEPLOYMENT,
    DEFAULT_AZURE_GPT_4_1_VERSION: process.env.DEFAULT_AZURE_GPT_4_1_VERSION,

    DEFAULT_COHERE_API_KEY: process.env.DEFAULT_COHERE_API_KEY,

    PARTITION_API_KEY: process.env.PARTITION_API_KEY,
    PARTITION_API_URL: process.env.PARTITION_API_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
