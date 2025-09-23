import type { ZodOpenApiOperationObject } from "zod-openapi";
import { openApiErrorResponses, successSchema } from "@/lib/openapi/responses";
import { IngestJobSchema } from "@/schemas/api/ingest-job";
import { tenantHeaderSchema } from "@/schemas/api/tenant";
import { z } from "zod/v4";

import { namespaceIdSchema } from "../utils";

export const reIngestJob: ZodOpenApiOperationObject = {
  operationId: "reIngestJob",
  "x-speakeasy-name-override": "re-ingest",
  "x-speakeasy-max-method-params": 1,
  summary: "Re-ingest a job",
  description: "Re-ingest a job for the authenticated organization.",
  requestParams: {
    path: z.object({
      namespaceId: namespaceIdSchema,
      jobId: z.string().describe("The id of the job to re-ingest."),
    }),
    header: tenantHeaderSchema,
  },
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
};
