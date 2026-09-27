import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod/v4";

import {
  enforceEuConfig,
  getEuEngineConfigIssues,
} from "@agentset/utils/region-guard";

const skipValidation = !!process.env.SKIP_ENV_VALIDATION;

export const env = createEnv({
  server: {
    DEFAULT_PINECONE_API_KEY: z.string().optional(),
    DEFAULT_PINECONE_HOST: z.url().optional(),

    SECONDARY_PINECONE_API_KEY: z.string().optional(),
    SECONDARY_PINECONE_HOST: z.url().optional(),

    DEFAULT_TURBOPUFFER_API_KEY: z.string().optional(),

    DEFAULT_AZURE_RESOURCE_NAME: z.string(),
    DEFAULT_AZURE_API_KEY: z.string(),

    DEFAULT_COHERE_API_KEY: z.string(),
    DEFAULT_COHERE_BASE_URL: z.url().optional(),
    DEFAULT_ZEROENTROPY_API_KEY: z.string().optional(),

    PARTITION_API_KEY: z.string(),
    PARTITION_API_URL: z.url(),
  },
  runtimeEnv: {
    DEFAULT_PINECONE_API_KEY: process.env.DEFAULT_PINECONE_API_KEY,
    DEFAULT_PINECONE_HOST: process.env.DEFAULT_PINECONE_HOST,

    SECONDARY_PINECONE_API_KEY: process.env.SECONDARY_PINECONE_API_KEY,
    SECONDARY_PINECONE_HOST: process.env.SECONDARY_PINECONE_HOST,

    DEFAULT_TURBOPUFFER_API_KEY: process.env.DEFAULT_TURBOPUFFER_API_KEY,

    DEFAULT_AZURE_RESOURCE_NAME: process.env.DEFAULT_AZURE_RESOURCE_NAME,
    DEFAULT_AZURE_API_KEY: process.env.DEFAULT_AZURE_API_KEY,

    DEFAULT_COHERE_API_KEY: process.env.DEFAULT_COHERE_API_KEY,
    DEFAULT_COHERE_BASE_URL: process.env.DEFAULT_COHERE_BASE_URL,
    DEFAULT_ZEROENTROPY_API_KEY: process.env.DEFAULT_ZEROENTROPY_API_KEY,

    PARTITION_API_KEY: process.env.PARTITION_API_KEY,
    PARTITION_API_URL: process.env.PARTITION_API_URL,
  },
  skipValidation,
  emptyStringAsUndefined: true,
});

if (!skipValidation) {
  enforceEuConfig(() => getEuEngineConfigIssues(process.env));
}
