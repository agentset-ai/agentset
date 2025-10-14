import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import {
  createNamespaceSchema,
  NamespaceSchema,
} from "@/schemas/api/namespace";

import { makeCodeSamples, ts } from "../code-samples";

export const createNamespace: ZodOpenApiOperationObject = {
  operationId: "createNamespace",
  "x-speakeasy-name-override": "create",
  "x-speakeasy-usage-example": true,
  summary: "Create a namespace.",
  description: "Create a namespace for the authenticated organization.",
  requestBody: {
    required: true,
    content: {
      "application/json": { schema: createNamespaceSchema },
    },
  },
  responses: {
    "201": {
      description: "The created namespace",
      content: {
        "application/json": {
          schema: successSchema(NamespaceSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Namespaces"],
  security: [{ token: [] }],
  ...makeCodeSamples(
    ts`
const namespace = await agentset.namespaces.create({
  name: "My Knowledge Base",
  slug: "my-knowledge-base",
  // embeddingConfig: {...},
  // vectorStoreConfig: {...},
});
console.log(namespace);
`,
    { isNs: false },
  ),
};
