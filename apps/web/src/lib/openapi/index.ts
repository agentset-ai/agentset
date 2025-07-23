import { DocumentSchema, DocumentStatusSchema } from "@/schemas/api/document";
import {
  IngestJobSchema,
  IngestJobStatusSchema,
} from "@/schemas/api/ingest-job";
import { NamespaceSchema } from "@/schemas/api/namespace";
import { createDocument } from "zod-openapi";

import { EmbeddingConfigSchema, VectorStoreSchema } from "@agentset/validation";

import { openApiErrorResponses } from "./responses";
import { v1Paths } from "./v1";

export const document = createDocument({
  openapi: "3.1.1",
  info: {
    title: "AgentsetAPI",
    description: "Agentset is agentic rag-as-a-service",
    version: "0.0.1",
    contact: {
      name: "Agentset Support",
      email: "support@agentset.ai",
      url: "https://api.agentset.ai/",
    },
    license: {
      name: "MIT License",
      url: "https://github.com/agentset-ai/agentset/blob/main/LICENSE.md",
    },
  },
  servers: [
    {
      url: "https://api.agentset.ai",
      description: "Production API",
    },
  ],
  paths: {
    ...v1Paths,
  },
  components: {
    schemas: {
      EmbeddingConfigSchema,
      VectorStoreSchema,
      NamespaceSchema,
      IngestJobSchema,
      IngestJobStatusSchema,
      DocumentSchema,
      DocumentStatusSchema,
    },
    securitySchemes: {
      token: {
        type: "http",
        description: "Default authentication mechanism",
        scheme: "bearer",
        "x-speakeasy-example": "AGENTSET_API_KEY",
      },
    },
    responses: {
      ...openApiErrorResponses,
    },
  },
});
