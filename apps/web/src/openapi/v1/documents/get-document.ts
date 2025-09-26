import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { DocumentSchema } from "@/schemas/api/document";

import { makeCodeSamples, ts } from "../code-samples";
import {
  documentIdPathSchema,
  namespaceIdPathSchema,
  tenantHeaderSchema,
} from "../utils";

export const getDocument: ZodOpenApiOperationObject = {
  operationId: "getDocument",
  "x-speakeasy-name-override": "get",
  summary: "Retrieve a document",
  description: "Retrieve the info for a document.",
  parameters: [namespaceIdPathSchema, documentIdPathSchema, tenantHeaderSchema],
  responses: {
    "200": {
      description: "The retrieved ingest job",
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
const document = await ns.documents.get("doc_123");
console.log(document);
`),
};
