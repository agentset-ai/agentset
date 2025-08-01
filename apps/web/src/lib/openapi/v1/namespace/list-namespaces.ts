import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import { NamespaceSchema } from "@/schemas/api/namespace";
import { z } from "zod/v4";

export const listNamespaces: ZodOpenApiOperationObject = {
  operationId: "listNamespaces",
  "x-speakeasy-name-override": "list",
  summary: "Retrieve a list of namespaces",
  description:
    "Retrieve a list of namespaces for the authenticated organization.",
  responses: {
    "200": {
      description: "The retrieved namespaces",
      content: {
        "application/json": {
          schema: successSchema(z.array(NamespaceSchema)),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Namespaces"],
  security: [{ token: [] }],
};
