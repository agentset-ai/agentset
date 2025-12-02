import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { IngestJobSchema } from "@/schemas/api/ingest-job";

import { makeCodeSamples, ts } from "../code-samples";
import {
  jobIdPathSchema,
  namespaceIdPathSchema,
  tenantHeaderSchema,
} from "../utils";

export const deleteIngestJob: ZodOpenApiOperationObject = {
  operationId: "deleteIngestJob",
  "x-speakeasy-name-override": "delete",
  "x-speakeasy-group": "ingestJobs",
  "x-speakeasy-max-method-params": 1,
  summary: "Delete an ingest job",
  description: "Delete an ingest job for the authenticated organization.",
  parameters: [namespaceIdPathSchema, jobIdPathSchema, tenantHeaderSchema],
  responses: {
    "204": {
      description: "The deleted ingest job",
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
await ns.ingestion.delete("job_123");
console.log("Ingest job queued for deletion");
`),
};
