import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import {
  createNamespaceSchema,
  NamespaceSchema,
} from "@/schemas/api/namespace";

export const createNamespace: ZodOpenApiOperationObject = {
  operationId: "createNamespace",
  "x-speakeasy-name-override": "create",
  "x-speakeasy-usage-example": true,
  summary: "Create a namespace.",
  description: "Create a namespace for the authenticated organization.",
  requestBody: {
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
};
