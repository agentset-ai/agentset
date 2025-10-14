import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { DocumentSchema, getDocumentsSchema } from "@/schemas/api/document";
import { z } from "zod/v4";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema, tenantHeaderSchema } from "../utils";

export const listDocuments: ZodOpenApiOperationObject = {
  operationId: "listDocuments",
  "x-speakeasy-name-override": "list",
  "x-speakeasy-pagination": {
    type: "cursor",
    inputs: [
      {
        name: "cursor",
        in: "parameters",
        type: "cursor",
      },
    ],
    outputs: {
      nextCursor: "$.pagination.nextCursor",
    },
  },
  summary: "Retrieve a list of documents",
  description:
    "Retrieve a paginated list of documents for the authenticated organization.",
  parameters: [namespaceIdPathSchema, tenantHeaderSchema],
  requestParams: {
    query: getDocumentsSchema,
  },
  responses: {
    "200": {
      description: "The retrieved ingest jobs",
      content: {
        "application/json": {
          schema: successSchema(z.array(DocumentSchema), {
            hasPagination: true,
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Documents"],
  security: [{ token: [] }],
  ...makeCodeSamples(ts`
const docs = await ns.documents.all();
console.log(docs);
`),
};
