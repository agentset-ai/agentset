import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import { DocumentSchema } from "@/schemas/api/document";
import { tenantHeaderSchema } from "@/schemas/api/tenant";
import { z } from "zod/v4";

import { namespaceIdSchema } from "../utils";

export const deleteDocument: ZodOpenApiOperationObject = {
  operationId: "deleteDocument",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete a document",
  description: "Delete a document for the authenticated organization.",
  requestParams: {
    path: z.object({
      namespaceId: namespaceIdSchema,
      documentId: z.string().describe("The id of the document to delete."),
    }),
    header: tenantHeaderSchema,
  },
  responses: {
    "204": {
      description: "The deleted document",
      content: {
        "application/json": {
          schema: successSchema(DocumentSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Documents"],
  security: [{ token: [] }],
};
