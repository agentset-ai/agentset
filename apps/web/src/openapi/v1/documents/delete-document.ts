import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { DocumentSchema } from "@/schemas/api/document";

import { makeCodeSamples, ts } from "../code-samples";
import {
  documentIdPathSchema,
  namespaceIdPathSchema,
  tenantHeaderSchema,
} from "../utils";

export const deleteDocument: ZodOpenApiOperationObject = {
  operationId: "deleteDocument",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete a document",
  description: "Delete a document for the authenticated organization.",
  parameters: [namespaceIdPathSchema, documentIdPathSchema, tenantHeaderSchema],
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
  ...makeCodeSamples(ts`
await ns.documents.delete("doc_123");
console.log("Document queued for deletion");
`),
};
