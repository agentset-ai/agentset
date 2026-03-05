import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { z } from "zod/v4";

import { makeCodeSamples, ts } from "../code-samples";
import { documentIdPathSchema, namespaceIdPathSchema } from "../utils";

export const getFileDownloadUrl: ZodOpenApiOperationObject = {
  operationId: "getFileDownloadUrl",
  "x-speakeasy-name-override": "getFileDownloadUrl",
  summary: "Get file download URL",
  description:
    "Get a presigned download URL for a document's source file. Only available for documents with source type MANAGED_FILE.",
  parameters: [namespaceIdPathSchema, documentIdPathSchema],
  responses: {
    "200": {
      description: "The presigned download URL for the file",
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
const { url } = await ns.documents.getFileDownloadUrl("doc_123");
const file = await fetch(url);
fs.writeFileSync("file.pdf", Buffer.from(await file.arrayBuffer()));
`),
};
