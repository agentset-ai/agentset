import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import {
  getIngestionJobsSchema,
  IngestJobSchema,
} from "@/schemas/api/ingest-job";
import { z } from "zod/v4";

import { makeCodeSamples, ts } from "../code-samples";
import { namespaceIdPathSchema, tenantHeaderSchema } from "../utils";

export const listIngestJobs: ZodOpenApiOperationObject = {
  operationId: "listIngestJobs",
  "x-speakeasy-name-override": "list",
  "x-speakeasy-group": "ingestJobs",
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
  summary: "Retrieve a list of ingest jobs",
  description:
    "Retrieve a paginated list of ingest jobs for the authenticated organization.",
  parameters: [namespaceIdPathSchema, tenantHeaderSchema],
  requestParams: {
    query: getIngestionJobsSchema,
  },
  responses: {
    "200": {
      description: "The retrieved ingest jobs",
      content: {
        "application/json": {
          schema: successSchema(z.array(IngestJobSchema), {
            hasPagination: true,
          }),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Ingest Jobs"],
  security: [{ token: [] }],
  ...makeCodeSamples(ts`
const jobs = await ns.ingestion.all();
console.log(jobs);
`),
};
