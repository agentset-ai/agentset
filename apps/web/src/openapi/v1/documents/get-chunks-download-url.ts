import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { z } from "zod/v4";

import { makeCodeSamples, ts } from "../code-samples";
import { documentIdPathSchema, namespaceIdPathSchema } from "../utils";

export const getChunksDownloadUrl: ZodOpenApiOperationObject = {
  operationId: "getChunksDownloadUrl",
  "x-speakeasy-name-override": "getChunksDownloadUrl",
  summary: "Get chunks download URL",
  description:
    "Get a presigned download URL for a document's chunks. Only available for completed documents.",
  parameters: [namespaceIdPathSchema, documentIdPathSchema],
  responses: {
    "200": {
      description: "The presigned download URL for the chunks",
      content: {
        "application/json": {
          schema: successSchema(z.object({ url: z.string() })),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Documents"],
  security: [{ token: [] }],
  ...makeCodeSamples(ts`
const { url } = await ns.documents.getChunksDownloadUrl("doc_123");
const data = await (await fetch(url)).json();
console.log(data);
`),
};
