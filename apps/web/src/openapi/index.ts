import { createDocument } from "zod-openapi";

import { webhookEventSchema } from "@agentset/webhooks";

import { v1Paths } from "./v1";

export const createOpenApiDocument = () => {
  return createDocument({
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
    "x-speakeasy-globals": {
      parameters: [
        {
          $ref: "#/components/parameters/NamespaceIdRef",
        },
        {
          $ref: "#/components/parameters/TenantIdRef",
        },
      ],
    },
    paths: {
      ...v1Paths,
    },
    components: {
      schemas: {
        webhookEventSchema,
      },
      securitySchemes: {
        token: {
          type: "http",
          description: "Default authentication mechanism",
          scheme: "bearer",
          "x-speakeasy-example": "AGENTSET_API_KEY",
        },
      },
    },
  });
};
