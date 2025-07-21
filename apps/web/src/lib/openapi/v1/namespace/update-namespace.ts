import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import {
  NamespaceSchema,
  updateNamespaceSchema,
} from "@/schemas/api/namespace";
import { z } from "zod/v4";

export const updateNamespace: ZodOpenApiOperationObject = {
  operationId: "updateNamespace",
  "x-speakeasy-name-override": "update",
  "x-speakeasy-max-method-params": 2,
  summary: "Update a namespace.",
  description:
    "Update a namespace for the authenticated organization. If there is no change, return it as it is.",
  requestParams: {
    path: z.object({
      namespaceId: z.string().describe("The id of the namespace to update."),
    }),
  },
  requestBody: {
    content: {
      "application/json": { schema: updateNamespaceSchema },
    },
  },
  responses: {
    "200": {
      description: "The updated namespace",
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
