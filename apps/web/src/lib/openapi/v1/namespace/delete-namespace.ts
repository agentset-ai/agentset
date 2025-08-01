import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import { NamespaceSchema } from "@/schemas/api/namespace";
import { z } from "zod/v4";

export const deleteNamespace: ZodOpenApiOperationObject = {
  operationId: "deleteNamespace",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete a namespace.",
  description:
    "Delete a namespace for the authenticated organization. This will delete all the data associated with the namespace.",
  requestParams: {
    path: z.object({
      namespaceId: z.string().describe("The id of the namespace to delete."),
    }),
  },
  responses: {
    "204": {
      description: "The deleted namespace",
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
