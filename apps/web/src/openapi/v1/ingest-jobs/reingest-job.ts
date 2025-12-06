import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { IngestJobSchema } from "@/schemas/api/ingest-job";

import { makeCodeSamples, ts } from "../code-samples";
import {
  jobIdPathSchema,
  namespaceIdPathSchema,
  tenantHeaderSchema,
} from "../utils";

export const reIngestJob: ZodOpenApiOperationObject = {
  operationId: "reIngestJob",
  "x-speakeasy-name-override": "reIngest",
  "x-speakeasy-group": "ingestJobs",
  "x-speakeasy-max-method-params": 1,
  summary: "Re-ingest a job",
  description: "Re-ingest a job for the authenticated organization.",
  parameters: [namespaceIdPathSchema, jobIdPathSchema, tenantHeaderSchema],
  responses: {
    "200": {
      description: "The re-ingested job",
      content: {
        "application/json": {
          schema: successSchema(IngestJobSchema.pick({ id: true })),
        },
      },
    },
    ...openApiErrorResponses,
  },
  tags: ["Ingest Jobs"],
  security: [{ token: [] }],
  ...makeCodeSamples(ts`
const result = await ns.ingestion.reIngest("job_123");
console.log("Job queued for re-ingestion: ", result);
`),
};
