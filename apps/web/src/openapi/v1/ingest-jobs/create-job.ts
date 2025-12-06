import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import {
  createIngestJobSchema,
  IngestJobSchema,
} from "@/schemas/api/ingest-job";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema, tenantHeaderSchema } from "../utils";

export const createIngestJob: ZodOpenApiOperationObject = {
  operationId: "createIngestJob",
  "x-speakeasy-name-override": "create",
  "x-speakeasy-group": "ingestJobs",
  summary: "Create an ingest job",
  description:
    "Create an ingest job for the authenticated organization. You can control how documents are parsed and chunked using the optional `config` object (for example, chunk size, overlap, language, and advanced OCR/LLM options).",
  parameters: [namespaceIdPathSchema, tenantHeaderSchema],
  requestBody: {
    required: true,
    content: {
      "application/json": { schema: createIngestJobSchema },
    },
  },
  responses: {
    "201": {
      description: "The created ingest job",
      content: {
        "application/json": {
          schema: successSchema(IngestJobSchema),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Ingest Jobs"],
  security: [{ token: [] }],
  ...makeCodeSamples(ts`
const job = await ns.ingestion.create({
  payload: {
    type: "TEXT",
    text: "This is some content to ingest into the knowledge base.",
  },
  config: {
    metadata: {
      foo: "bar",
    },
    chunkSize: 2048,
  },
});
console.log(job);
`),
};
