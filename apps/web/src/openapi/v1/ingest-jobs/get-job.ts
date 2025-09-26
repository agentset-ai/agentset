import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/openapi/responses";
import { IngestJobSchema } from "@/schemas/api/ingest-job";

import { makeCodeSamples, ts } from "../code-samples";
import {
  jobIdPathSchema,
  namespaceIdPathSchema,
  tenantHeaderSchema,
} from "../utils";

export const getIngestJobInfo: ZodOpenApiOperationObject = {
  operationId: "getIngestJobInfo",
  "x-speakeasy-name-override": "get",
  "x-speakeasy-group": "ingestJobs",
  summary: "Retrieve an ingest job",
  description: "Retrieve the info for an ingest job.",
  parameters: [namespaceIdPathSchema, jobIdPathSchema, tenantHeaderSchema],
  responses: {
    "200": {
      description: "The retrieved ingest job",
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
const job = await ns.ingestion.get("job_123");
console.log(job);
`),
};
